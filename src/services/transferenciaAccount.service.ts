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

// Busca y bloquea la cuenta destino por CVU (22 dígitos) o por alias.
export async function getDestinationAccount(
  destino: string,
  transaction: Transaction,
) {
  if (typeof destino !== 'string' || destino.trim() === '') {
    throw new Error('Debe indicar el CVU o alias de destino');
  }

  const valor = destino.trim();
  const esCvu = /^\d{22}$/.test(valor);

  const account = await Cuenta.findOne({
    where: esCvu ? { cvu: valor } : { alias: valor.toLowerCase() },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!account) {
    throw new Error(
      esCvu
        ? 'No existe una cuenta con ese CVU'
        : 'No existe una cuenta con ese alias',
    );
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