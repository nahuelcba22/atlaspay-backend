import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/exchange.service', () => ({
  ExchangeService: {
    getRates: vi.fn(),
    procesarExchange: vi.fn(),
    getStats: vi.fn(),
  },
}));
vi.mock('../src/services/exchangeEmail.service', () => ({
  notifyExchangeSuccess: vi.fn(),
  notifyExchangeFailure: vi.fn(),
  resolveExchangeOperationType: vi.fn(() => 'CAMBIO'),
}));

import { realizarExchange } from '../src/controllers/exchange.controller';
import {
  notifyExchangeFailure,
  notifyExchangeSuccess,
} from '../src/services/exchangeEmail.service';
import { ExchangeService } from '../src/services/exchange.service';
import { AppError } from '../src/utils/appError';

const rates = { USD: 1, ARS: 1000, EUR: 0.9, PEN: 3.7 };

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function fakeReq(body: Record<string, unknown>) {
  return { usuario: { id: 'user-1' }, body } as any;
}

const validBody = {
  montoVenta: 1000,
  monedaOrigen: 'ARS',
  monedaDestino: 'EUR',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.mocked(ExchangeService.getRates).mockResolvedValue({
    source: 'cache',
    last_updated: new Date().toISOString(),
    rates,
  });
});

describe('realizarExchange', () => {
  it('responds 200 and emails the persisted amounts', async () => {
    vi.mocked(ExchangeService.procesarExchange).mockResolvedValue({
      cuenta: {},
      historial: {
        id: 'tx-1',
        fecha: new Date('2026-01-01T00:00:00Z'),
        monto: '1000.00',
        monto_destino: '0.90',
        tasa: 0.0009,
      },
    } as never);
    const res = fakeRes();

    await realizarExchange(fakeReq(validBody), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(notifyExchangeSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1000,
        destinationAmount: 0.9,
        exchangeRate: 0.0009,
        transactionId: 'tx-1',
      }),
    );
    expect(notifyExchangeFailure).not.toHaveBeenCalled();
  });

  it.each([
    [403, 'La cuenta no está activa'],
    [404, 'Cuenta no encontrada'],
    [400, 'Fondos insuficientes en ARS'],
    [503, 'Servicio de exchange no disponible temporalmente'],
  ])('maps AppError %s to the same HTTP status', async (status, message) => {
    vi.mocked(ExchangeService.procesarExchange).mockRejectedValue(
      new AppError(message, status),
    );
    const res = fakeRes();

    await realizarExchange(fakeReq(validBody), res);

    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ error: message });
  });

  it('answers validation errors with 400 and the original message', async () => {
    const res = fakeRes();

    await realizarExchange(fakeReq({ ...validBody, montoVenta: -5 }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'El monto debe ser mayor a 0',
    });
    expect(ExchangeService.procesarExchange).not.toHaveBeenCalled();
  });

  it('hides unexpected error details from the client and the failure email', async () => {
    vi.mocked(ExchangeService.procesarExchange).mockRejectedValue(
      new Error('connection to db-host:5432 refused'),
    );
    const res = fakeRes();

    await realizarExchange(fakeReq(validBody), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
    expect(notifyExchangeFailure).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: 'Error interno del servidor' }),
    );
  });

  it('hides the message of an internal AppError (5xx other than 503)', async () => {
    vi.mocked(ExchangeService.procesarExchange).mockRejectedValue(
      new AppError('Valor decimal inválido', 500),
    );
    const res = fakeRes();

    await realizarExchange(fakeReq(validBody), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
  });
});