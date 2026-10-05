type Currency = 'ARS' | 'USD' | 'EUR' | 'PEN';

interface ExchangeValidationResult {
  monedaOrigen: Currency;
  monedaDestino: Currency;
  tipoDeCambio: number;
}

// Valida los datos del exchange y calcula la tasa entre monedas.
export function validateExchangeRequest(
  montoVenta: number,
  monedaOrigen: string,
  monedaDestino: string,
  rates: Record<Currency, number>,
): ExchangeValidationResult {
  if (!montoVenta || !monedaOrigen || !monedaDestino) {
    throw new Error(
      'Faltan datos (montoVenta, monedaOrigen, monedaDestino)',
    );
  }

  if (montoVenta <= 0) {
    throw new Error('El monto debe ser mayor a 0');
  }

  if (!(monedaOrigen in rates)) {
    throw new Error('Moneda de origen no soportada');
  }

  if (!(monedaDestino in rates)) {
    throw new Error('Moneda de destino no soportada');
  }

  const origen = monedaOrigen as Currency;
  const destino = monedaDestino as Currency;

  const montoEnUSD = montoVenta / rates[origen];
  const minimoUSD = 0.1;

  if (montoEnUSD < minimoUSD) {
    let mensaje =
      `El monto mínimo por operación es de $${minimoUSD} USD`;

    if (origen !== 'USD') {
      const minimoOrigen = (minimoUSD * rates[origen]).toFixed(2);
      mensaje += ` (Aprox. $${minimoOrigen} ${origen})`;
    }

    throw new Error(mensaje);
  }

  return {
    monedaOrigen: origen,
    monedaDestino: destino,
    tipoDeCambio: rates[destino] / rates[origen],
  };
}