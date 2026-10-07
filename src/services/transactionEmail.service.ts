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

// Envía la notificación y registra cada etapa para facilitar el diagnóstico.
export async function sendTransactionEmail(
  data: SendTransactionEmailParams,
): Promise<void> {
  if (!env.TRANSACTION_EMAIL_URL) {
    console.error('[EMAIL] Falta TRANSACTION_EMAIL_URL en el backend.');
    return;
  }

  try {
    console.info('[EMAIL] Buscando usuario:', data.userId);

    const usuario = await Usuario.findByPk(data.userId);

    if (!usuario) {
      console.error('[EMAIL] Usuario no encontrado:', data.userId);
      return;
    }

    console.info('[EMAIL] Llamando a Vercel:', {
      status: data.status,
      type: data.transaction.type,
    });

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

    const responseBody = await response.text();

    if (!response.ok) {
      console.error('[EMAIL] Vercel respondió con error:', {
        status: response.status,
        body: responseBody,
      });
      return;
    }

    console.info('[EMAIL] Vercel confirmó el envío:', {
      status: response.status,
      body: responseBody,
    });
  } catch (error) {
    // El email nunca debe provocar el fallo de la operación financiera.
    console.error('[EMAIL] Falló la llamada backend -> Vercel:', error);
  }
}