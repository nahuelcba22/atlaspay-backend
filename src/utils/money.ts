import { AppError } from './appError';

// Largest value that fits in DECIMAL(15,2), expressed in cents.
export const MAX_CENTS = 10 ** 15 - 1;

// Converts a user-supplied amount to integer cents.
// Rejects NaN, Infinity, values <= 0, more than 2 decimals and overflow.
export function toPositiveCents(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new AppError('El monto debe ser un número positivo');
  }

  const cents = Math.round(value * 100);

  // Tolerance absorbs binary floating point noise (e.g. 0.07 * 100).
  if (Math.abs(value * 100 - cents) > 1e-6) {
    throw new AppError('El monto admite como máximo 2 decimales');
  }
  if (cents < 1 || cents > MAX_CENTS) {
    throw new AppError('El monto está fuera del rango permitido');
  }

  return cents;
}

// Converts a DECIMAL value as returned by pg (string) into integer cents.
// Strict on purpose: a malformed value must never become NaN in a balance.
export function centsFromDecimal(value: string | number): number {
  const str = String(value);

  if (!/^-?\d+(\.\d{1,2})?$/.test(str)) {
    throw new AppError('Valor decimal inválido', 500);
  }

  const negative = str.startsWith('-');
  const [integerPart, fraction = ''] = str.replace('-', '').split('.');
  const cents = Number(integerPart) * 100 + Number(fraction.padEnd(2, '0'));

  return negative && cents !== 0 ? -cents : cents;
}

// Serializes integer cents into a decimal string for DECIMAL(15,2) columns.
export function decimalFromCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new AppError('Los centavos deben ser un entero seguro', 500);
  }

  const abs = Math.abs(cents);
  const sign = cents < 0 ? '-' : '';

  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

// Applies an exchange rate to an amount in cents, rounding to the nearest cent.
export function convertCents(cents: number, rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new AppError('Tasa de cambio inválida', 500);
  }

  return Math.round(cents * rate);
}