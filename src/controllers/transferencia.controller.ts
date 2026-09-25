import { Response } from 'express';
import { obtenerHistorial, procesarTransferencia } from '../services/transferencia.service';

export const getTransferencias = async (req: any, res: any) => {
  try {
    const transferencias = await obtenerHistorial(req.usuario.id);
    res.status(200).json({ message: 'Historial obtenido con exito', transferencias });
  } catch (error: any) {
    if (error.message === 'Cuenta no encontrada') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Hubo un problema al consultar el historial' });
    }
  }
};

export const crearTransferencia = async (req: any, res: any) => {
  try {
    const { cvu_destino, monto, motivo } = req.body;
    const comprobante = await procesarTransferencia(req.usuario.id, cvu_destino, monto, motivo);
    
    res.status(200).json({ message: 'Transferencia realizada con exito', comprobante });
  } catch (error: any) {
    const mensajesCliente = ['Monto invalido', 'Cuenta origen no encontrada', 'Cuenta destino no encontrada', 'Auto-transferencia no permitida', 'Saldo insuficiente'];
    
    if (mensajesCliente.includes(error.message)) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Error en transferencia:', error);
      res.status(500).json({ error: 'Hubo un problema al procesar la transferencia' });
    }
  }
};