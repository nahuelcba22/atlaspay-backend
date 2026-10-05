import { Cuenta } from '../models/Cuenta';
import { Usuario } from '../models/Usuario';

// Obtiene los datos del usuario y su cuenta.
export const getUserProfile = async (userId: string) => {
  const user = await Usuario.findByPk(userId);

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const account = await Cuenta.findOne({
    where: { usuario_id: userId },
  });

  if (!account) {
    throw new Error('Cuenta no encontrada');
  }

  return { user, account };
};