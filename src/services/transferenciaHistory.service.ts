import { Op } from 'sequelize';
import { Cuenta } from '../models/Cuenta';
import { Transferencia } from '../models/Transferencia';

// Obtiene el historial de movimientos asociados a la cuenta del usuario.
export async function obtenerHistorial(usuarioId: string) {
  const cuenta = await Cuenta.findOne({
    where: { usuario_id: usuarioId },
  });

  if (!cuenta) {
    throw new Error('Cuenta no encontrada');
  }

  return Transferencia.findAll({
    where: {
      [Op.or]: [
        { cuenta_origen_id: cuenta.id },
        { cuenta_destino_id: cuenta.id },
      ],
    },
    order: [['fecha', 'DESC']],
  });
}