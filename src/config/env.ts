import dotenv from 'dotenv';

dotenv.config();

// Obtiene una variable obligatoria y evita iniciar la app si falta.
function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }

  return value;
}

function parsePort(): number {
  const rawPort = (process.env.PORT ?? '3000').trim();

  if (!/^\d+$/.test(rawPort)) {
    throw new Error('PORT debe ser un entero entre 0 y 65535');
  }

  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('PORT debe ser un entero entre 0 y 65535');
  }

  return port;
}

const port = parsePort();

// Centraliza las variables de entorno utilizadas por el backend.
export const env = {
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),
  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID?.trim() ?? '',
  TRANSACTION_EMAIL_URL: process.env.TRANSACTION_EMAIL_URL?.trim() ?? '',
  PORT: port,
};