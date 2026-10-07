import { obtenerMovimientos } from '../services/historial.service';
import {
  validateHistorialQuery,
  type HistorialFiltros,
} from '../utils/historialValidation';

export const getHistorial = async (req: any, res: any) => {
  let filtros: HistorialFiltros;

  // Cualquier error de validación de los filtros es un 400.
  try {
    filtros = validateHistorialQuery(req.query);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
    return;
  }

  try {
    const historial = await obtenerMovimientos(req.usuario.id, filtros);

    res.status(200).json(historial);
  } catch (error: any) {
    if (error.message === 'Cuenta no encontrada') {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Error al obtener el historial:', error);

    res.status(500).json({
      error: 'Hubo un problema al consultar el historial',
    });
  }
};
