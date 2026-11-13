import { AppError } from './appError';

type Currency = 'ARS' | 'USD' | 'EUR' | 'PEN';

interface ExchangeValidationResult {
  monedaOrigen: Currency;
  monedaDestino: Currency;
  tipoDeCambio: number;
}

// Own-property check: `in` also matches prototype keys such as "constructor".
const isSupported = (currency: string, rates: Record<Currency, number>) =>
  Object.prototype.hasOwnProperty.call(rates, currency);

// Validates the exchange request and computes the rate between currencies.
export function validateExchangeRequest(
  montoVenta: number,
  monedaOrigen: string,
  monedaDestino: string,
  rates: Record<Currency, number>,
): ExchangeValidationResult {
  if (!montoVenta || !monedaOrigen || !monedaDestino) {
    throw new AppError(
      'Faltan datos (montoVenta, monedaOrigen, monedaDestino)',
    );
  }

  // Strings such as "abc" would otherwise slip through the comparisons below
  // (NaN <= 0 is false) and end up as NaN in a balance.
  if (typeof montoVenta !== 'number' || !Number.isFinite(montoVenta)) {
    throw new AppError('El monto debe ser un número válido');
  }

  if (montoVenta <= 0) {
    throw new AppError('El monto debe ser mayor a 0');
  }

  if (!isSupported(monedaOrigen, rates)) {
    throw new AppError('Moneda de origen no soportada');
  }

  if (!isSupported(monedaDestino, rates)) {
    throw new AppError('Moneda de destino no soportada');
  }

  if (monedaOrigen === monedaDestino) {
    throw new AppError('Las monedas de origen y destino deben ser diferentes');
  }

  const origen = monedaOrigen as Currency;
  const destino = monedaDestino as Currency;

  const montoEnUSD = montoVenta / rates[origen];
  const minimoUSD = 0.1;

  if (montoEnUSD < minimoUSD) {
    let mensaje = `El monto mínimo por operación es de $${minimoUSD} USD`;

    if (origen !== 'USD') {
      const minimoOrigen = (minimoUSD * rates[origen]).toFixed(2);
      mensaje += ` (Aprox. $${minimoOrigen} ${origen})`;
    }

    throw new AppError(mensaje);
  }

  return {
    monedaOrigen: origen,
    monedaDestino: destino,
    tipoDeCambio: rates[destino] / rates[origen],
  };
}