import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/db', () => ({
  sequelize: {
    transaction: vi.fn(async (callback: (t: unknown) => unknown) =>
      callback({ LOCK: { UPDATE: 'UPDATE' } }),
    ),
  },
}));
vi.mock('../src/models/Cuenta', () => ({
  Cuenta: { findOne: vi.fn(), findAll: vi.fn(), update: vi.fn() },
}));
vi.mock('../src/models/Transferencia', () => ({
  Transferencia: { create: vi.fn() },
}));

import { sequelize } from '../src/db';
import { Cuenta } from '../src/models/Cuenta';
import { Transferencia } from '../src/models/Transferencia';
import { procesarTransferencia } from '../src/services/transferencia.service';
import { AppError } from '../src/utils/appError';

const CVU = '0000000000000000000001';

// Stand-in for a locked Cuenta row; pg returns DECIMAL as strings.
function fakeCuenta(id: string, overrides: Record<string, string> = {}) {
  const data: Record<string, string> = {
    estado: 'activa',
    saldo_ars: '0.00',
    saldo_usd: '0.00',
    ...overrides,
  };
  return { id, estado: data.estado, get: (key: string) => data[key] };
}
type FakeCuenta = ReturnType<typeof fakeCuenta>;

// findOne resolves the origin (by usuario_id) and the destination (by cvu/alias);
// findAll returns the rows locked by lockAccounts.
function setup(origen: FakeCuenta | null, destino: FakeCuenta | null) {
  vi.mocked(Cuenta.findOne).mockImplementation((async (options: {
    where: Record<string, unknown>;
  }) => {
    const account = 'usuario_id' in options.where ? origen : destino;
    return account ? { id: account.id } : null;
  }) as never);
  vi.mocked(Cuenta.findAll).mockResolvedValue(
    [origen, destino].filter(Boolean) as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(Transferencia.create).mockResolvedValue({ id: 'tx-1' } as never);
});

describe('procesarTransferencia', () => {
  it('moves funds in integer cents and persists decimal strings', async () => {
    setup(
      fakeCuenta('a', { saldo_ars: '1000.00' }),
      fakeCuenta('b', { saldo_ars: '0.05' }),
    );

    await procesarTransferencia('user-a', CVU, 300, 'rent', 'ars');

    expect(Cuenta.update).toHaveBeenNthCalledWith(
      1,
      { saldo_ars: '700.00' },
      { where: { id: 'a' }, transaction: expect.anything() },
    );
    expect(Cuenta.update).toHaveBeenNthCalledWith(
      2,
      { saldo_ars: '300.05' },
      { where: { id: 'b' }, transaction: expect.anything() },
    );
    expect(Transferencia.create).toHaveBeenCalledWith(
      expect.objectContaining({
        cuenta_origen_id: 'a',
        cuenta_destino_id: 'b',
        tipo: 'TRANSFERENCIA',
        monto: '300.00',
        moneda: 'ARS',
        motivo: 'rent',
      }),
      { transaction: expect.anything() },
    );
  });

  it('locks both accounts once, ordered by id, before writing', async () => {
    setup(
      fakeCuenta('a', { saldo_ars: '100.00' }),
      fakeCuenta('b'),
    );

    await procesarTransferencia('user-a', CVU, 10, 'x', 'ARS');

    expect(Cuenta.findAll).toHaveBeenCalledTimes(1);
    expect(Cuenta.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ order: [['id', 'ASC']], lock: 'UPDATE' }),
    );
    expect(
      vi.mocked(Cuenta.findAll).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(Cuenta.update).mock.invocationCallOrder[0]);
  });

  it('does not lock during the id lookups', async () => {
    setup(fakeCuenta('a', { saldo_ars: '100.00' }), fakeCuenta('b'));

    await procesarTransferencia('user-a', CVU, 10, 'x', 'ARS');

    // A lock taken in lookup order is what caused the A->B / B->A deadlock.
    expect(Cuenta.findOne).toHaveBeenCalledTimes(2);
    for (const [options] of vi.mocked(Cuenta.findOne).mock.calls) {
      expect(options).not.toHaveProperty('lock');
    }
  });

  it('looks up aliases in lower case', async () => {
    setup(fakeCuenta('a', { saldo_ars: '100.00' }), fakeCuenta('b'));

    await procesarTransferencia('user-a', ' Mi.Alias ', 10, 'x', 'ARS');

    expect(Cuenta.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { alias: 'mi.alias' } }),
    );
  });

  it('uses the default reason when none is given', async () => {
    setup(fakeCuenta('a', { saldo_ars: '100.00' }), fakeCuenta('b'));

    await procesarTransferencia('user-a', CVU, 10, '', 'ARS');

    expect(Transferencia.create).toHaveBeenCalledWith(
      expect.objectContaining({ motivo: 'Varias' }),
      expect.anything(),
    );
  });

  it('accepts the minimum amount and numeric strings', async () => {
    setup(fakeCuenta('a', { saldo_ars: '100.00' }), fakeCuenta('b'));

    await procesarTransferencia('user-a', CVU, 0.1, 'x', 'ARS');
    await procesarTransferencia('user-a', CVU, '25' as unknown as number, 'x', 'ARS');

    expect(Cuenta.update).toHaveBeenNthCalledWith(
      1,
      { saldo_ars: '99.90' },
      expect.anything(),
    );
    expect(Cuenta.update).toHaveBeenNthCalledWith(
      3,
      { saldo_ars: '75.00' },
      expect.anything(),
    );
  });
});

describe('procesarTransferencia - rejections', () => {
  it.each([0, 0.05, -1, NaN, Infinity, 'abc', true, null, 1.005])(
    'rejects invalid amount %s before opening a transaction',
    async (amount) => {
      await expect(
        procesarTransferencia('user-a', CVU, amount as number, 'x', 'ARS'),
      ).rejects.toBeInstanceOf(AppError);

      expect(sequelize.transaction).not.toHaveBeenCalled();
    },
  );

  it.each(['XXX', '', 'constructor', 5])(
    'rejects invalid currency %s',
    async (currency) => {
      await expect(
        procesarTransferencia('user-a', CVU, 10, 'x', currency as string),
      ).rejects.toMatchObject({ message: 'Moneda invalida', status: 400 });

      expect(sequelize.transaction).not.toHaveBeenCalled();
    },
  );

  it('keeps the existing message for a missing origin account', async () => {
    setup(null, fakeCuenta('b'));

    await expect(
      procesarTransferencia('user-a', CVU, 10, 'x', 'ARS'),
    ).rejects.toMatchObject({
      message: 'Cuenta origen no encontrada',
      status: 400,
    });
  });

  it('keeps the existing messages for unknown CVU and alias', async () => {
    setup(fakeCuenta('a', { saldo_ars: '100.00' }), null);

    await expect(
      procesarTransferencia('user-a', CVU, 10, 'x', 'ARS'),
    ).rejects.toThrow('No existe una cuenta con ese CVU');
    await expect(
      procesarTransferencia('user-a', 'no.existe', 10, 'x', 'ARS'),
    ).rejects.toThrow('No existe una cuenta con ese alias');
  });

  it('rejects a missing destination value', async () => {
    setup(fakeCuenta('a', { saldo_ars: '100.00' }), fakeCuenta('b'));

    await expect(
      procesarTransferencia('user-a', '  ', 10, 'x', 'ARS'),
    ).rejects.toThrow('Debe indicar el CVU o alias de destino');
  });

  it('rejects self-transfers before locking anything', async () => {
    const cuenta = fakeCuenta('a', { saldo_ars: '100.00' });
    setup(cuenta, cuenta);

    await expect(
      procesarTransferencia('user-a', CVU, 10, 'x', 'ARS'),
    ).rejects.toThrow('Auto-transferencia no permitida');

    expect(Cuenta.findAll).not.toHaveBeenCalled();
  });

  it('rejects insufficient funds and writes nothing', async () => {
    setup(fakeCuenta('a', { saldo_ars: '10.00' }), fakeCuenta('b'));

    await expect(
      procesarTransferencia('user-a', CVU, 50, 'x', 'ARS'),
    ).rejects.toMatchObject({ message: 'Saldo insuficiente', status: 400 });

    expect(Cuenta.update).not.toHaveBeenCalled();
    expect(Transferencia.create).not.toHaveBeenCalled();
  });

  it('rejects an inactive origin account with 403', async () => {
    setup(
      fakeCuenta('a', { saldo_ars: '100.00', estado: 'bloqueada' }),
      fakeCuenta('b'),
    );

    await expect(
      procesarTransferencia('user-a', CVU, 10, 'x', 'ARS'),
    ).rejects.toMatchObject({ status: 403 });

    expect(Cuenta.update).not.toHaveBeenCalled();
  });

  it('rejects an inactive destination account', async () => {
    setup(
      fakeCuenta('a', { saldo_ars: '100.00' }),
      fakeCuenta('b', { estado: 'bloqueada' }),
    );

    await expect(
      procesarTransferencia('user-a', CVU, 10, 'x', 'ARS'),
    ).rejects.toThrow('no puede recibir transferencias');

    expect(Cuenta.update).not.toHaveBeenCalled();
  });

  it('rejects a transfer that would overflow the destination balance', async () => {
    setup(
      fakeCuenta('a', { saldo_ars: '100.00' }),
      fakeCuenta('b', { saldo_ars: '9999999999999.99' }),
    );

    await expect(
      procesarTransferencia('user-a', CVU, 1, 'x', 'ARS'),
    ).rejects.toThrow('excede el límite permitido');

    expect(Cuenta.update).not.toHaveBeenCalled();
  });
});