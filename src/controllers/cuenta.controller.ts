import { Response } from 'express';
import { obtenerCuentaPorUsuario } from '../services/cuenta.service';

export const getCuenta = async (req: any, res: any) => {
  try {
    const cuenta = await obtenerCuentaPorUsuario(req.usuario.id);
    res.status(200).json({
      message: 'Datos de la cuenta obtenidos exitosamente',
      cuenta: { cvu: cuenta.cvu, alias: cuenta.alias, saldo: cuenta.saldo, estado: cuenta.estado }
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