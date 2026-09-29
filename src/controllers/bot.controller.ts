import { Request, Response } from 'express';
import { procesarMensajeBot } from '../services/gemini.service';

export const conversarConBot = async (req: Request, res: Response) => {
  try {
    const { mensaje } = req.body;
    if (!mensaje) {
      return res.status(400).json({ error: 'Debes proporcionar un mensaje' });
    }

    const respuesta = await procesarMensajeBot(mensaje);
    res.status(200).json({ success: true, data: { respuesta } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error en el bot' });
  }
};