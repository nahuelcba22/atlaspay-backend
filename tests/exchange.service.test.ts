import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/db', () => ({
  sequelize: {
    transaction: vi.fn(async (callback: (t: unknown) => unknown) =>
      callback({ LOCK: { UPDATE: 'UPDATE' } }),
    ),
  },
}));
vi.mock('../src/models/Cuenta', () => ({ Cuenta: { findOne: vi.fn() } }));
vi.mock('../src/models/Transferencia', () => ({
  Transferencia: { create: vi.fn(), count: vi.fn(), findAll: vi.fn() },
}));

import { Cuenta } from '../src/models/Cuenta';
import { Transferencia } from '../src/models/Transferencia';
import { ExchangeService } from '../src/services/exchange.service';
import { AppError } from '../src/utils/appError';

// Minimal stand-in for a locked Cuenta row; pg returns DECIMAL as strings.
function fakeCuenta(overrides: Record<string, string> = {}) {
  const data: Record<string, string> = {
    id: 'cuenta-1',
    estado: 'activa',
    saldo_ars: '100000.00',
    saldo_usd: '0.00',
    saldo_eur: '0.00',
    saldo_pen: '0.00',
    ...overrides,
  };
  return {
    id: data.id,
    estado: data.estado,
    get: (key: string) => data[key],
    update: vi.fn(async () => undefined),
  };
}

function mockCuenta(cuenta: ReturnType<typeof fakeCuenta> | null) {
  vi.mocked(Cuenta.findOne).mockResolvedValue(cuenta as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(ExchangeService, 'getRates').mockResolvedValue({
    source: 'cache',
    last_updated: new Date().toISOString(),
    rates: { USD: 1, ARS: 1000, EUR: 0.9, PEN: 3.7 },
  });
  vi.mocked(Transferencia.create).mockResolvedValue({ id: 'tx-1' } as never);
});

describe('ExchangeService.procesarExchange', () => {
  it('converts in integer cents and persists decimal strings', async () => {
    const cuenta = fakeCuenta();
    mockCuenta(cuenta);

    const result = await ExchangeService.procesarExchange(
      'user-1',
      1000,
      'ARS',
      'USD',
    );

    expect(cuenta.update).toHaveBeenCalledWith(
      { saldo_ars: '99000.00', saldo_usd: '1.00' },
      { transaction: expect.anything() },
    );
    expect(Transferencia.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'CAMBIO',
        monto: '1000.00',
        moneda: 'ARS',
        monto_destino: '1.00',
        moneda_destino: 'USD',
      }),
      { transaction: expect.anything() },
    );
    expect(result.historial).toEqual({ id: 'tx-1' });
  });

  it('allows spending the exact balance', async () => {
    const cuenta = fakeCuenta({ saldo_ars: '1000.00' });
    mockCuenta(cuenta);

    await ExchangeService.procesarExchange('user-1', 1000, 'ARS', 'USD');

    expect(cuenta.update).toHaveBeenCalledWith(
      { saldo_ars: '0.00', saldo_usd: '1.00' },
      { transaction: expect.anything() },
    );
  });

  it.each([-5, 0, NaN, Infinity, 1.005, 'abc'])(
    'rejects invalid amount %s without touching the database',
    async (amount) => {
      await expect(
        ExchangeService.procesarExchange(
          'user-1',
          amount as number,
          'ARS',
          'USD',
        ),
      ).rejects.toBeInstanceOf(AppError);

      expect(Cuenta.findOne).not.toHaveBeenCalled();
      expect(Transferencia.create).not.toHaveBeenCalled();
    },
  );

  it('rejects identical currencies', async () => {
    await expect(
      ExchangeService.procesarExchange('user-1', 100, 'USD', 'USD'),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('rejects currencies outside the whitelist', async () => {
    await expect(
      ExchangeService.procesarExchange(
        'user-1',
        100,
        'constructor' as never,
        'USD',
      ),
    ).rejects.toThrow('no soportada');

    expect(Cuenta.findOne).not.toHaveBeenCalled();
  });

  it('rejects insufficient funds and leaves balances untouched', async () => {
    const cuenta = fakeCuenta({ saldo_ars: '10.00' });
    mockCuenta(cuenta);

    await expect(
      ExchangeService.procesarExchange('user-1', 1000, 'ARS', 'USD'),
    ).rejects.toThrow('Fondos insuficientes en ARS');

    expect(cuenta.update).not.toHaveBeenCalled();
    expect(Transferencia.create).not.toHaveBeenCalled();
  });

  it('rejects an inactive account with 403', async () => {
    const cuenta = fakeCuenta({ estado: 'bloqueada' });
    mockCuenta(cuenta);

    await expect(
      ExchangeService.procesarExchange('user-1', 1000, 'ARS', 'USD'),
    ).rejects.toMatchObject({ status: 403 });

    expect(cuenta.update).not.toHaveBeenCalled();
  });

  it('rejects a missing account with 404', async () => {
    mockCuenta(null);

    await expect(
      ExchangeService.procesarExchange('user-1', 1000, 'ARS', 'USD'),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('rejects amounts that convert to less than one cent', async () => {
    mockCuenta(fakeCuenta());

    // 0.01 ARS * 0.001 = 0.00001 USD, below one cent.
    await expect(
      ExchangeService.procesarExchange('user-1', 0.01, 'ARS', 'USD'),
    ).rejects.toThrow('demasiado bajo');
  });
});