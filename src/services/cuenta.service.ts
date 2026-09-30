import { Cuenta } from '../models/Cuenta';

// Crea una cuenta nueva con CVU y alias generados automáticamente.
export const crearCuentaParaUsuario = async (usuarioId: string, nombre: string) => {
  const cvu = Math.random().toString().slice(2, 22).padEnd(22, '0');
  const alias =
    nombre.toLowerCase().replace(/\s/g, '') +
    '.' +
    Math.floor(Math.random() * 1000) +
    '.atlas';

  return Cuenta.create({
    usuario_id: usuarioId,
    cvu,
    alias,
  });
};

// Obtiene la cuenta asociada a un usuario.
export const obtenerCuentaPorUsuario = async (usuarioId: string) => {
  const cuenta = await Cuenta.findOne({ where: { usuario_id: usuarioId } });

  if (!cuenta) {
    throw new Error('Cuenta no encontrada');
  }

  return cuenta;
};