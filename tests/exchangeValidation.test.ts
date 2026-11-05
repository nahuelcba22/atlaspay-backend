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

describe('Validación del monto', () => {
  it.each([['abc'], ['100'], [Infinity], [{}]])(
    'rechaza un monto que no es un número finito (%o)',
    (monto) => {
      expect(() =>
        validateExchangeRequest(monto as unknown as number, 'USD', 'EUR', rates),
      ).toThrow('El monto debe ser un número válido');
    },
  );

  it('rechaza montos negativos', () => {
    expect(() => validateExchangeRequest(-5, 'USD', 'EUR', rates)).toThrow(
      'El monto debe ser mayor a 0',
    );
  });

  it('rechaza montos por debajo del mínimo', () => {
    expect(() => validateExchangeRequest(0.01, 'USD', 'EUR', rates)).toThrow(
      'El monto mínimo por operación',
    );
  });
});

describe('Validación de monedas', () => {
  it.each(['constructor', 'toString', '__proto__'])(
    'rechaza la clave de prototipo %s como moneda de origen',
    (moneda) => {
      expect(() => validateExchangeRequest(100, moneda, 'USD', rates)).toThrow(
        'Moneda de origen no soportada',
      );
    },
  );

  it('rechaza una moneda de destino desconocida', () => {
    expect(() => validateExchangeRequest(100, 'USD', 'XXX', rates)).toThrow(
      'Moneda de destino no soportada',
    );
  });
});