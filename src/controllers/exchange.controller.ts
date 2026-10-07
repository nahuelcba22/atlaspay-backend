import { Request, Response } from 'express';
import { ExchangeService } from '../services/exchange.service';
import {
  notifyExchangeFailure,
  notifyExchangeSuccess,
} from '../services/exchangeEmail.service';
import { validateExchangeRequest } from '../utils/exchangeValidation';

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

  const { montoVenta, monedaOrigen, monedaDestino } = req.body;

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
    );

    notifyExchangeSuccess({
      userId,
      amount: Number(montoVenta),
      currency: validated.monedaOrigen,
      destinationAmount: Number(montoVenta) * validated.tipoDeCambio,
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
      notifyExchangeFailure({
        userId,
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
