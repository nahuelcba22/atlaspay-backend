import {
  sendTransactionEmail,
  type TransactionType,
} from './transactionEmail.service';

export type ExchangeOperationType = Extract<
  TransactionType,
  'CAMBIO' | 'COMPRA' | 'VENTA'
>;

interface ExchangeEmailParams {
  userId: string;
  operationType: ExchangeOperationType;
  amount: number;
  currency: string;
  destinationCurrency?: string;
  destinationAmount?: number;
  exchangeRate?: number;
  transactionId?: string;
  date?: string;
  errorMessage?: string;
}

// Valida el tipo recibido y mantiene CAMBIO como valor por defecto.
export function resolveExchangeOperationType(
  type: unknown,
): ExchangeOperationType {
  if (type === 'COMPRA' || type === 'VENTA' || type === 'CAMBIO') {
    return type;
  }

  return 'CAMBIO';
}

// Notifica una operación de exchange completada correctamente.
export function notifyExchangeSuccess(
  data: ExchangeEmailParams,
): void {
  void sendTransactionEmail({
    userId: data.userId,
    status: 'SUCCESS',
    transaction: {
      type: data.operationType,
      amount: data.amount,
      currency: data.currency,
      destinationAmount: data.destinationAmount,
      destinationCurrency: data.destinationCurrency,
      exchangeRate: data.exchangeRate,
      transactionId: data.transactionId,
      date: data.date,
    },
  });
}

// Notifica una operación de exchange fallida.
export function notifyExchangeFailure(
  data: ExchangeEmailParams,
): void {
  void sendTransactionEmail({
    userId: data.userId,
    status: 'FAILED',
    transaction: {
      type: data.operationType,
      amount: data.amount,
      currency: data.currency,
      destinationCurrency: data.destinationCurrency,
      exchangeRate: data.exchangeRate,
      date: data.date,
    },
    errorMessage: data.errorMessage,
  });
}