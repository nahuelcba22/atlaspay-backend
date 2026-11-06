import { AppError } from '../utils/appError';

const MIN_TRANSFER_AMOUNT = 0.1;

const balanceColumns: Record<string, string> = {
  ARS: 'saldo_ars',
  USD: 'saldo_usd',
  EUR: 'saldo_eur',
  PEN: 'saldo_pen',
};

// Validates the minimum allowed amount for a transfer.
// Numeric strings are still accepted for backwards compatibility; any other
// type (boolean, null, object) is rejected instead of being coerced.
export function validateTransferAmount(amount: unknown): number {
  const message = 'El monto mínimo es 0.1';

  if (typeof amount !== 'number' && typeof amount !== 'string') {
    throw new AppError(message);
  }

  const parsedAmount = Number(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount < MIN_TRANSFER_AMOUNT) {
    throw new AppError(message);
  }

  return parsedAmount;
}

// Validates the currency and returns the matching balance column.
// The result is built from a whitelist, so it is safe to use as a column name.
export function getBalanceColumn(currency: unknown): string {
  if (typeof currency !== 'string') {
    throw new AppError('Moneda invalida');
  }

  const key = currency.toUpperCase();

  if (!Object.prototype.hasOwnProperty.call(balanceColumns, key)) {
    throw new AppError('Moneda invalida');
  }

  return balanceColumns[key];
}