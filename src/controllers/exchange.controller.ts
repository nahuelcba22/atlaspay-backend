import { Request, Response } from 'express';
import { ExchangeService } from '../services/exchange.service';

// 1. Función original: Solo devuelve las cotizaciones para mostrarlas en el frontend
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

// 2. NUEVA FUNCIÓN: Ejecuta la lógica matemática y la transacción en la base de datos
export const realizarExchange = async (req: Request, res: Response) => {
  try {
    // Tomamos el ID del usuario desde el token. 
    // Uso un fallback (usuario o user) dependiendo de cómo lo hayas nombrado en tu middleware validarToken
    const usuario_id = (req as any).usuario?.id || (req as any).user?.id; 
    
    const { montoVenta, monedaOrigen, monedaDestino } = req.body;

    // Validación básica
    if (!montoVenta || !monedaOrigen || !monedaDestino) {
      return res.status(400).json({ error: 'Faltan datos (montoVenta, monedaOrigen, monedaDestino)' });
    }

    // Llamamos al servicio
    const resultado = await ExchangeService.procesarExchange(
      usuario_id, 
      montoVenta, 
      monedaOrigen, 
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