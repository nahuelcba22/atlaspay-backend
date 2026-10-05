import { sendTransactionEmail } from './transactionEmail.service';

interface ExchangeEmailParams {
  userId: string;
  amount: number;
  currency: string;
  destinationCurrency?: string;
  destinationAmount?: number;
  exchangeRate?: number;
  transactionId?: string;
  date?: string;
  errorMessage?: string;
}

// Notifica un exchange completado correctamente.
export function notifyExchangeSuccess(
  data: ExchangeEmailParams,
): void {
  void sendTransactionEmail({
    userId: data.userId,
    status: 'SUCCESS',
    transaction: {
      type: 'CAMBIO',
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

// Notifica un intento de exchange fallido.
export function notifyExchangeFailure(
  data: ExchangeEmailParams,
): void {
  void sendTransactionEmail({
    userId: data.userId,
    status: 'FAILED',
    transaction: {
      type: 'CAMBIO',
      amount: data.amount,
      currency: data.currency,
      destinationCurrency: data.destinationCurrency,
      exchangeRate: data.exchangeRate,
      date: data.date,
    },
    errorMessage: data.errorMessage,
  });
}