import { Op } from 'sequelize';
import type { Transaction } from 'sequelize';
import { Cuenta } from '../models/Cuenta';
import { AppError } from '../utils/appError';
import { decimalFromCents } from '../utils/money';

// Resolves the origin account id. No lock here: see lockAccounts.
export async function findOriginAccountId(
  userId: string,
  transaction: Transaction,
): Promise<string> {
  const account = await Cuenta.findOne({
    where: { usuario_id: userId },
    attributes: ['id'],
    transaction,
  });

  if (!account) {
    throw new AppError('Cuenta origen no encontrada');
  }

  return account.id;
}

// Resolves the destination account id by CVU (22 digits) or alias. No lock here.
export async function findDestinationAccountId(
  destino: string,
  transaction: Transaction,
): Promise<string> {
  if (typeof destino !== 'string' || destino.trim() === '') {
    throw new AppError('Debe indicar el CVU o alias de destino');
  }

  const valor = destino.trim();
  const esCvu = /^\d{22}$/.test(valor);

  const account = await Cuenta.findOne({
    where: esCvu ? { cvu: valor } : { alias: valor.toLowerCase() },
    attributes: ['id'],
    transaction,
  });

  if (!account) {
    throw new AppError(
      esCvu
        ? 'No existe una cuenta con ese CVU'
        : 'No existe una cuenta con ese alias',
    );
  }

  return account.id;
}

// Locks both accounts in a single query ordered by id. Every transfer takes
// its locks in the same global order, so opposite transfers (A->B and B->A)
// cannot deadlock. Balances must be read from the returned rows, which are
// fresh once the lock is held (READ COMMITTED, the Postgres default).
export async function lockAccounts(
  originId: string,
  destinationId: string,
  transaction: Transaction,
) {
  const rows = await Cuenta.findAll({
    where: { id: { [Op.in]: [originId, destinationId] } },
    order: [['id', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  const origen = rows.find((row) => row.id === originId);
  const destino = rows.find((row) => row.id === destinationId);

  if (!origen || !destino) {
    throw new AppError('Cuenta no encontrada', 404);
  }

  return { origen, destino };
}

// Writes a balance (integer cents) inside the same transaction.
// `column` must come from getBalanceColumn.
export async function updateAccountBalance(
  accountId: string,
  column: string,
  cents: number,
  transaction: Transaction,
) {
  await Cuenta.update(
    { [column]: decimalFromCents(cents) },
    { where: { id: accountId }, transaction },
  );
}