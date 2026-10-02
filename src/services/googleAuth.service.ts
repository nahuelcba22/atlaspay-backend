import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { Usuario } from '../models/Usuario';
import { crearCuentaParaUsuario } from './cuenta.service';
import { env } from '../config/env';

const googleClient = new OAuth2Client();

interface GoogleProfile {
  email?: string;
  email_verified?: boolean;
  name?: string;
}

// Verifica el token de Google y crea o autentica al usuario.
export const autenticarUsuarioGoogle = async (accessToken: string) => {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new Error('Google no está configurado');
  }

  const tokenInfo = await googleClient.getTokenInfo(accessToken);

  if (tokenInfo.aud !== env.GOOGLE_CLIENT_ID) {
    throw new Error('Cuenta de Google no válida');
  }

  const profileResponse = await fetch(
    'https://openidconnect.googleapis.com/v1/userinfo',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!profileResponse.ok) {
    throw new Error('Cuenta de Google no válida');
  }

  const profile = (await profileResponse.json()) as GoogleProfile;

  if (!profile.email || !profile.email_verified) {
    throw new Error('Cuenta de Google no válida');
  }

  const email = profile.email;
  const nombre = profile.name || email.split('@')[0];

  let usuario = await Usuario.findOne({ where: { email } });

  // Crea automáticamente el usuario si todavía no existe.
  if (!usuario) {
    const passwordTemporal = await bcrypt.hash(randomUUID(), 10);

    usuario = await Usuario.create({
      nombre,
      email,
      password_hash: passwordTemporal,
    });

    await crearCuentaParaUsuario(usuario.id, nombre);
  }

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email },
    env.JWT_SECRET,
    { expiresIn: '24h' },
  );

  return { token, usuario };
};