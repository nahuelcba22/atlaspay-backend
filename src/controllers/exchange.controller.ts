import { Request, Response } from 'express';
import { ExchangeService } from '../services/exchange.service';
import {
  notifyExchangeFailure,
  notifyExchangeSuccess,
  resolveExchangeOperationType,
} from '../services/exchangeEmail.service';
import { validateExchangeRequest } from '../utils/exchangeValidation';

export const getExchangeRates = async (
  req: Request,
  res: Response,
) => {
  try {
    const data = await ExchangeService.getRates();

    res.status(200).json({
      success: true,
      base: 'USD',
      ...data,
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      message: error.message,
    });
  }
};

export const realizarExchange = async (
  req: Request,
  res: Response,
) => {
  const userId =
    (req as any).usuario?.id || (req as any).user?.id;

  const {
    montoVenta,
    monedaOrigen,
    monedaDestino,
    tipoOperacion,
  } = req.body;

  const operationType =
    resolveExchangeOperationType(tipoOperacion);

  try {
    const { rates } = await ExchangeService.getRates();

    const validated = validateExchangeRequest(
      montoVenta,
      monedaOrigen,
      monedaDestino,
      rates,
    );

    const resultado = await ExchangeService.procesarExchange(
      userId,
      montoVenta,
      validated.monedaOrigen,
      validated.monedaDestino,
      operationType,
    );

    // Envía el mail correspondiente a cambio, compra o venta.
    notifyExchangeSuccess({
      userId,
      operationType,
      amount: Number(montoVenta),
      currency: validated.monedaOrigen,
      destinationAmount:
        Number(montoVenta) * validated.tipoDeCambio,
      destinationCurrency: validated.monedaDestino,
      exchangeRate: validated.tipoDeCambio,
      transactionId: resultado.historial.id,
      date: resultado.historial.fecha?.toISOString(),
    });

    return res.status(200).json({
      mensaje: 'Exchange realizado con éxito',
      operacion: resultado,
    });
  } catch (error: any) {
    if (userId) {
      // También conserva el tipo correcto en operaciones fallidas.
      notifyExchangeFailure({
        userId,
        operationType,
        amount: Number(montoVenta) || 0,
        currency: monedaOrigen || 'N/D',
        destinationCurrency: monedaDestino,
        date: new Date().toISOString(),
        errorMessage: error.message,
      });
    }

    return res.status(400).json({
      error: error.message,
    });
  }
};