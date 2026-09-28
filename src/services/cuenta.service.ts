import { Cuenta } from '../models/Cuenta';

export const obtenerCuentaPorUsuario = async (usuarioId: string) => {
  const cuenta = await Cuenta.findOne({ where: { usuario_id: usuarioId } });
  if (!cuenta) throw new Error('Cuenta no encontrada');
  return cuenta;
};