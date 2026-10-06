import type { Transaction } from 'sequelize';
import { Cuenta } from '../models/Cuenta';

// Busca y bloquea la cuenta origen durante la transferencia.
export async function getOriginAccount(
  userId: string,
  transaction: Transaction,
) {
  const account = await Cuenta.findOne({
    where: { usuario_id: userId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!account) {
    throw new Error('Cuenta origen no encontrada');
  }

  return account;
}

// Busca y bloquea la cuenta destino usando su CVU.
export async function getDestinationAccount(
  cvu: string,
  transaction: Transaction,
) {
  const account = await Cuenta.findOne({
    where: { cvu },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!account) {
    throw new Error('Cuenta destino no encontrada');
  }

  return account;
}

// Actualiza el saldo de una cuenta dentro de la misma transacción.
export async function updateAccountBalance(
  accountId: string,
  column: string,
  balance: number,
  transaction: Transaction,
) {
  await Cuenta.update(
    { [column]: balance } as any,
    {
      where: { id: accountId },
      transaction,
    },
  );
}