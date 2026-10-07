const MIN_TRANSFER_AMOUNT = 0.1;

const balanceColumns: Record<string, string> = {
  ARS: 'saldo_ars',
  USD: 'saldo_usd',
  EUR: 'saldo_eur',
  PEN: 'saldo_pen',
};

// Valida el monto mínimo permitido para una transferencia.
export function validateTransferAmount(amount: number): number {
  const parsedAmount = Number(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount < MIN_TRANSFER_AMOUNT) {
    throw new Error('El monto mínimo es 0.1');
  }

  return parsedAmount;
}

// Valida la moneda y devuelve la columna de saldo correspondiente.
export function getBalanceColumn(currency: string): string {
  if (!currency) {
    throw new Error('Moneda invalida');
  }

  const column = balanceColumns[currency.toUpperCase()];

  if (!column) {
    throw new Error('Moneda invalida');
  }

  return column;
}