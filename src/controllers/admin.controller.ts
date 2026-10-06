import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Transferencia } from '../models/Transferencia';
import { Cuenta } from '../models/Cuenta';
import { Usuario } from '../models/Usuario';

export const obtenerHistorialGlobal = async (req: Request, res: Response) => {
  try {
    const transferencias = await Transferencia.findAll({
      order: [['fecha', 'DESC']],
      include: [
        {
          model: Cuenta,
          as: 'cuentaOrigen', 
          include: [{ model: Usuario, attributes: ['id', 'nombre', 'email'] }]
        },
        {
          model: Cuenta,
          as: 'cuentaDestino', 
          include: [{ model: Usuario, attributes: ['id', 'nombre', 'email'] }]
        }
      ]
    });

    res.status(200).json({
      message: 'Historial global recuperado',
      total: transferencias.length,
      data: transferencias
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al consultar las transferencias' });
  }
};

export const obtenerOperacionesCambio = async (req: Request, res: Response) => {
  try {
    const operaciones = await Transferencia.findAll({
      where: {
        motivo: {
          [Op.like]: 'Exchange de %'
        }
      },
      order: [['fecha', 'DESC']],
      include: [
        {
          model: Cuenta,
          as: 'cuentaOrigen',
          include: [{ model: Usuario, attributes: ['id', 'nombre', 'email'] }]
        }
      ]
    });

    res.status(200).json({
      message: 'Operaciones de exchange recuperadas con éxito',
      total: operaciones.length,
      data: operaciones
    });
  } catch (error) {
    console.error('Error al obtener operaciones de cambio:', error);
    res.status(500).json({ error: 'Hubo un problema al consultar las operaciones de exchange' });
  }
};