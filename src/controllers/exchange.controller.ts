import { Request, Response } from 'express';
import { ExchangeService } from '../services/exchange.service';

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
  try {
    const usuario_id = (req as any).usuario?.id || (req as any).user?.id;

    const { montoVenta, monedaOrigen, monedaDestino } = req.body;

    if (!montoVenta || !monedaOrigen || !monedaDestino) {
      return res.status(400).json({
        error: 'Faltan datos (montoVenta, monedaOrigen, monedaDestino)'
      });
    }

    if (montoVenta <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    const ratesData = await ExchangeService.getRates();
    const rates = ratesData.rates;

    if (typeof monedaOrigen !== 'string' || !(monedaOrigen in rates)) {
      return res.status(400).json({ error: 'Moneda de origen no soportada' });
    }

    const monedaOrigenKey = monedaOrigen as keyof typeof rates;

    const montoEnUSD = montoVenta / rates[monedaOrigenKey];
    const MINIMO_USD = 0.1;

  if (montoEnUSD < MINIMO_USD) {
      let mensajeError = 'El monto mínimo por operación es de $' + MINIMO_USD + ' USD';
      
      if (monedaOrigenKey !== 'USD') {
        const minimoEnOrigen = (MINIMO_USD * rates[monedaOrigenKey]).toFixed(2);
        mensajeError += ' (Aprox. $' + minimoEnOrigen + ' ' + monedaOrigenKey + ')';
      } else if (monedaDestino in rates && monedaDestino !== 'USD') {
        const monedaDestinoKey = monedaDestino as keyof typeof rates;
        const minimoEnDestino = (MINIMO_USD * rates[monedaDestinoKey]).toFixed(2);
        mensajeError += ' (Aprox. $' + minimoEnDestino + ' ' + monedaDestinoKey + ')';
      }
      
      return res.status(400).json({
        error: mensajeError
      });
    }
    const resultado = await ExchangeService.procesarExchange(
      usuario_id,
      montoVenta,
      monedaOrigenKey,
      monedaDestino
    );

    return res.status(200).json({
      mensaje: 'Exchange realizado con éxito',
      operacion: resultado
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};