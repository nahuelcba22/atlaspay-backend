import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/db', () => ({ sequelize: { transaction: vi.fn() } }));
vi.mock('../src/models/Cuenta', () => ({ Cuenta: { findOne: vi.fn() } }));
vi.mock('../src/models/Transferencia', () => ({
  Transferencia: { create: vi.fn(), count: vi.fn(), findAll: vi.fn() },
}));

import { Op } from 'sequelize';
import { Transferencia } from '../src/models/Transferencia';
import { ExchangeService } from '../src/services/exchange.service';

const T0 = new Date('2026-01-01T00:00:00Z').getTime();
const HOUR = 60 * 60 * 1000;

const apiPayload = { rates: { ARS: 1000, EUR: 0.9, PEN: 3.7 } };

const fetchMock = vi.fn();

function okResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  // Reset the static cache between tests.
  (ExchangeService as any).ratesCache = null;
  (ExchangeService as any).lastUpdate = 0;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ExchangeService.getRates', () => {
  it('fetches from the API with a timeout signal and then serves the cache', async () => {
    fetchMock.mockResolvedValue(okResponse(apiPayload));

    const first = await ExchangeService.getRates();
    const second = await ExchangeService.getRates();

    expect(first.source).toBe('api');
    expect(first.rates).toEqual({ USD: 1, ARS: 1000, EUR: 0.9, PEN: 3.7 });
    expect(second.source).toBe('cache');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('falls back to a cache younger than 6 hours when the API fails', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(apiPayload));
    await ExchangeService.getRates();

    vi.setSystemTime(T0 + HOUR); // past the 30 min TTL, within 6 h
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    const result = await ExchangeService.getRates();

    expect(result.source).toBe('fallback_cache');
    expect(result.rates.ARS).toBe(1000);
  });

  it('rejects when the cache is older than 6 hours and the API fails', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(apiPayload));
    await ExchangeService.getRates();

    vi.setSystemTime(T0 + 7 * HOUR);
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(ExchangeService.getRates()).rejects.toThrow(
      'Servicio de exchange no disponible temporalmente',
    );
  });

  it('rejects when the API fails and there is no cache', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(ExchangeService.getRates()).rejects.toThrow(
      'Servicio de exchange no disponible temporalmente',
    );
  });

  it('treats a non-ok response as a failure', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });

    await expect(ExchangeService.getRates()).rejects.toThrow(
      'Servicio de exchange no disponible temporalmente',
    );
  });

  it.each([
    ['a missing currency', { rates: { ARS: 1000, EUR: 0.9 } }],
    ['a zero rate', { rates: { ARS: 0, EUR: 0.9, PEN: 3.7 } }],
    ['a non-numeric rate', { rates: { ARS: '1000', EUR: 0.9, PEN: 3.7 } }],
    ['no rates object', {}],
  ])('does not cache a response with %s', async (_label, payload) => {
    fetchMock.mockResolvedValue(okResponse(payload));

    await expect(ExchangeService.getRates()).rejects.toThrow(
      'Servicio de exchange no disponible temporalmente',
    );
    expect((ExchangeService as any).ratesCache).toBeNull();
  });
});

describe('ExchangeService.getStats', () => {
  it('filters by tipo instead of matching the motivo text', async () => {
    vi.mocked(Transferencia.count).mockResolvedValue(3 as never);
    vi.mocked(Transferencia.findAll).mockResolvedValue([] as never);

    const stats = await ExchangeService.getStats();

    const expectedWhere = {
      tipo: { [Op.in]: ['CAMBIO', 'COMPRA', 'VENTA'] },
    };
    expect(Transferencia.count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(Transferencia.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedWhere, group: ['moneda'] }),
    );
    expect(stats.totalOperaciones).toBe(3);
  });

  it('wraps database errors in a generic message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(Transferencia.count).mockRejectedValue(new Error('db detail'));

    await expect(ExchangeService.getStats()).rejects.toThrow(
      'No se pudieron calcular las estadísticas de exchange',
    );
  });
});