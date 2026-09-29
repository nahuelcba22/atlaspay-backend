import { Response } from 'express';
import { obtenerCuentaPorUsuario } from '../services/cuenta.service';

export const getCuenta = async (req: any, res: any) => {
  try {
    const cuenta = await obtenerCuentaPorUsuario(req.usuario.id);
    
    res.status(200).json({
      message: 'Datos de la cuenta obtenidos exitosamente',
      cuenta: { 
        cvu: (cuenta as any).cvu, 
        alias: (cuenta as any).alias, 
        estado: (cuenta as any).estado,
        saldos: {
          ARS: Number((cuenta as any).saldo_ars ?? 0),
          USD: Number((cuenta as any).saldo_usd ?? 0),
          EUR: Number((cuenta as any).saldo_eur ?? 0),
          PEN: Number((cuenta as any).saldo_pen ?? 0)
        }
      }
    });
  } catch (error: any) {
    if (error.message === 'Cuenta no encontrada') {
      res.status(404).json({ error: error.message });
    } else {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener la cuenta' });
    }
  }
};