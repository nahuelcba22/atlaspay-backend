import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models/Usuario';
import { Cuenta } from '../models/Cuenta';
import { env } from '../config/env';

export const registrarNuevoUsuario = async (nombre: string, email: string, password: string) => {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const nuevoUsuario = await Usuario.create({
    nombre,
    email,
    password_hash: hashedPassword,
  });

  const cvuAleatorio = Math.random().toString().slice(2, 22).padEnd(22, '0');
  const aliasAleatorio =
    nombre.toLowerCase().replace(/\s/g, '') + '.' + Math.floor(Math.random() * 1000) + '.atlas';

  const nuevaCuenta = await Cuenta.create({
    usuario_id: nuevoUsuario.id,
    cvu: cvuAleatorio,
    alias: aliasAleatorio,
  });

  return { nuevoUsuario, nuevaCuenta };
};

export const autenticarUsuario = async (email: string, password: string) => {
  const usuario = await Usuario.findOne({ where: { email } });

  if (!usuario) {
    throw new Error('Credenciales invalidas');
  }

  const passwordValido = await bcrypt.compare(password, usuario.password_hash);

  if (!passwordValido) {
    throw new Error('Credenciales invalidas');
  }

  // Firma el JWT con el secreto configurado en el entorno.
  const token = jwt.sign({ id: usuario.id, email: usuario.email }, env.JWT_SECRET, {
    expiresIn: '24h',
  });

  return { token, usuario };
};