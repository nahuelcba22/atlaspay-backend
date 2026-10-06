import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models/Usuario';
import { crearCuentaParaUsuario } from './cuenta.service';
import { env } from '../config/env';

// Registra un usuario con email y contraseña.
export const registrarNuevoUsuario = async (
  nombre: string,
  email: string,
  password: string,
) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  const nuevoUsuario = await Usuario.create({
    nombre,
    email,
    password_hash: hashedPassword,
  });

  const nuevaCuenta = await crearCuentaParaUsuario(nuevoUsuario.id, nombre);

  return { nuevoUsuario, nuevaCuenta };
};

// Autentica un usuario con email y contraseña.
export const autenticarUsuario = async (email: string, password: string) => {
  const usuario = await Usuario.findOne({ where: { email } });

  if (!usuario) {
    throw new Error('Credenciales invalidas');
  }

  const passwordValido = await bcrypt.compare(password, usuario.password_hash);

  if (!passwordValido) {
    throw new Error('Credenciales invalidas');
  }

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, role: usuario.role }, 
    env.JWT_SECRET, 
    { expiresIn: '24h' }
  );

  return { token, usuario };
};