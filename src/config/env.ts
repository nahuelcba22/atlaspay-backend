import dotenv from 'dotenv';

dotenv.config();

// Obtiene una variable obligatoria y evita iniciar la app si falta.
function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }

  return value;
}

const port = Number(process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('PORT debe ser un entero entre 0 y 65535');
}

// Centraliza las variables de entorno utilizadas por el backend.
export const env = {
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),
  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
  TRANSACTION_EMAIL_URL: process.env.TRANSACTION_EMAIL_URL ?? '',
  PORT: port,
};