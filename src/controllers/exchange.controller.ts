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