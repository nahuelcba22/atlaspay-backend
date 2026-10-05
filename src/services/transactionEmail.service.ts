import { env } from '../config/env';
import { Usuario } from '../models/Usuario';

export type TransactionStatus = 'SUCCESS' | 'FAILED';

export type TransactionType =
  | 'COMPRA'
  | 'VENTA'
  | 'CAMBIO'
  | 'TRANSFERENCIA';

export interface TransactionEmailData {
  type: TransactionType;
  amount: number;
  currency: string;
  destinationAmount?: number;
  destinationCurrency?: string;
  exchangeRate?: number;
  transactionId?: string;
  date?: string;
}

interface SendTransactionEmailParams {
  userId: string;
  status: TransactionStatus;
  transaction: TransactionEmailData;
  errorMessage?: string;
}

// Envía al usuario los datos de una operación mediante la Vercel Function.
export async function sendTransactionEmail(
  data: SendTransactionEmailParams,
): Promise<void> {
  if (!env.TRANSACTION_EMAIL_URL) {
    console.warn('TRANSACTION_EMAIL_URL todavía no está configurada.');
    return;
  }

  try {
    const usuario = await Usuario.findByPk(data.userId);

    if (!usuario) {
      console.error('No se encontró el usuario para enviar el email.');
      return;
    }

    const response = await fetch(env.TRANSACTION_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: usuario.email,
        userName: usuario.nombre,
        status: data.status,
        transaction: data.transaction,
        errorMessage: data.errorMessage,
      }),
    });

    if (!response.ok) {
      console.error(
        'Error al enviar la notificación:',
        response.status,
        await response.text(),
      );
    }
  } catch (error) {
    // El email nunca debe provocar el fallo de la operación financiera.
    console.error('No se pudo enviar la notificación:', error);
  }
}