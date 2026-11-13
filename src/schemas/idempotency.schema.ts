import { z } from 'zod';

// Client-generated key (e.g. a UUID). 8-64 chars, URL-safe.
export const idempotencyKeySchema = z
  .string()
  .regex(
    /^[A-Za-z0-9_-]{8,64}$/,
    'Idempotency-Key inválida: use entre 8 y 64 caracteres (letras, números, - y _)',
  );