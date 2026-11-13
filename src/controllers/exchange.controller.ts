import { Request, Response } from 'express';
import { ExchangeService } from '../services/exchange.service';
import {
  notifyExchangeFailure,
  notifyExchangeSuccess,
  resolveExchangeOperationType,
} from '../services/exchangeEmail.service';
import { AppError } from '../utils/appError';
import { validateExchangeRequest } from '../utils/exchangeValidation';

const GENERIC_ERROR = 'Error interno del servidor';

// Client errors (4xx) and "provider unavailable" (503) expose their message.
// Anything else is unexpected: log it and hide the detail from the client
// and from the failure email.
function toHttpError(error: unknown): { status: number; message: string } {
  if (error instanceof AppError && (error.status < 500 || error.status === 503)) {
    return { status: error.status, message: error.message };
  }

  console.error('Error inesperado en exchange:', error);
  return { status: 500, message: GENERIC_ERROR };
}

export const getExchangeRates = async (req: Request, res: Response) => {
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

export const realizarExchange = async (req: Request, res: Response) => {
  const userId = (req as any).usuario?.id || (req as any).user?.id;

  const { montoVenta, monedaOrigen, monedaDestino, tipoOperacion } = req.body;

  const operationType = resolveExchangeOperationType(tipoOperacion);

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

    const { historial } = resultado;

    // The email reports what was persisted, not a recomputation: the rate may
    // have changed and the destination amount is rounded to cents in the service.
    notifyExchangeSuccess({
      userId,
      operationType,
      amount: Number(historial.monto),
      currency: validated.monedaOrigen,
      destinationAmount: Number(historial.monto_destino),
      destinationCurrency: validated.monedaDestino,
      exchangeRate: Number(historial.tasa),
      transactionId: historial.id,
      date: historial.fecha?.toISOString(),
    });

    return res.status(200).json({
      mensaje: 'Exchange realizado con éxito',
      operacion: resultado,
    });
  } catch (error: unknown) {
    const { status, message } = toHttpError(error);

    if (userId) {
      // También conserva el tipo correcto en operaciones fallidas.
      notifyExchangeFailure({
        userId,
        operationType,
        amount: Number(montoVenta) || 0,
        currency: monedaOrigen || 'N/D',
        destinationCurrency: monedaDestino,
        date: new Date().toISOString(),
        errorMessage: message,
      });
    }

    return res.status(status).json({ error: message });
  }
};

export const getExchangeStats = async (_req: Request, res: Response) => {
  try {
    // Delegamos la consulta a la base de datos al servicio
    const stats = await ExchangeService.getStats();

    return res.status(200).json({
      success: true,
      message: 'Estadísticas de exchange obtenidas con éxito',
      data: stats,
    });
  } catch (error: any) {
    console.error('Error al obtener estadísticas de exchange:', error);
    return res.status(500).json({
      success: false,
      error: 'Hubo un problema al consultar las estadísticas del motor',
    });
  }
};