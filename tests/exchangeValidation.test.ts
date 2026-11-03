import { describe, expect, it } from 'vitest';
import { validateExchangeRequest } from '../src/utils/exchangeValidation';

const rates = {
  USD: 1,
  ARS: 1000,
  EUR: 0.9,
  PEN: 3.7,
};

describe('Validación de operaciones de exchange', () => {
  it('rechaza operaciones entre la misma moneda', () => {
    expect(() =>
      validateExchangeRequest(100, 'USD', 'USD', rates),
    ).toThrow('Las monedas de origen y destino deben ser diferentes');
  });

  it('calcula la tasa para monedas diferentes', () => {
    expect(
      validateExchangeRequest(100, 'USD', 'EUR', rates),
    ).toEqual({
      monedaOrigen: 'USD',
      monedaDestino: 'EUR',
      tipoDeCambio: 0.9,
    });
  });
});
