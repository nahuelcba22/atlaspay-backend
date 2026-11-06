import { sequelize } from '../db';
import { Transferencia } from '../models/Transferencia';
import { AppError } from '../utils/appError';
import {
  MAX_CENTS,
  centsFromDecimal,
  decimalFromCents,
  toPositiveCents,
} from '../utils/money';
import {
  findDestinationAccountId,
  findOriginAccountId,
  lockAccounts,
  updateAccountBalance,
} from './transferenciaAccount.service';
import {
  getBalanceColumn,
  validateTransferAmount,
} from './transferenciaValidation.service';

// Processes a transfer between two accounts; the destination is a CVU or alias.
export async function procesarTransferencia(
  usuarioId: string,
  cvuOAlias: string,
  monto: number,
  motivo: string,
  moneda: string,
) {
  // Input checks run before opening a transaction.
  const montoCents = toPositiveCents(validateTransferAmount(monto));
  const columnaSaldo = getBalanceColumn(moneda);

  const motivoFinal =
    typeof motivo === 'string' && motivo.trim() !== ''
      ? motivo.trim().slice(0, 255)
      : 'Varias';

  return sequelize.transaction(async (t) => {
    // 1. Resolve ids without locking.
    const origenId = await findOriginAccountId(usuarioId, t);
    const destinoId = await findDestinationAccountId(cvuOAlias, t);

    if (origenId === destinoId) {
      throw new AppError('Auto-transferencia no permitida');
    }

    // 2. Lock both rows in id order, then read balances from the locked rows.
    const { origen, destino } = await lockAccounts(origenId, destinoId, t);

    if (origen.estado !== 'activa') {
      throw new AppError('La cuenta no está activa', 403);
    }
    if (destino.estado !== 'activa') {
      throw new AppError('La cuenta de destino no puede recibir transferencias');
    }

    // 3. Integer-cents math.
    const saldoOrigen = centsFromDecimal(origen.get(columnaSaldo) as string);
    const saldoDestino = centsFromDecimal(destino.get(columnaSaldo) as string);

    if (saldoOrigen < montoCents) {
      throw new AppError('Saldo insuficiente');
    }
    if (saldoDestino + montoCents > MAX_CENTS) {
      throw new AppError(
        'El saldo de la cuenta de destino excede el límite permitido',
      );
    }

    await updateAccountBalance(origen.id, columnaSaldo, saldoOrigen - montoCents, t);
    await updateAccountBalance(destino.id, columnaSaldo, saldoDestino + montoCents, t);

    return Transferencia.create(
      {
        cuenta_origen_id: origen.id,
        cuenta_destino_id: destino.id,
        tipo: 'TRANSFERENCIA',
        monto: decimalFromCents(montoCents),
        moneda: moneda.toUpperCase(),
        motivo: motivoFinal,
      },
      { transaction: t },
    );
  });
}