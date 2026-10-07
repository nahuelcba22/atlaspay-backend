import { sequelize } from '../db';
import { Transferencia } from '../models/Transferencia';
import {
  getDestinationAccount,
  getOriginAccount,
  updateAccountBalance,
} from './transferenciaAccount.service';
import {
  getBalanceColumn,
  validateTransferAmount,
} from './transferenciaValidation.service';

// Procesa una transferencia entre dos cuentas; el destino puede ser CVU o alias.
export async function procesarTransferencia(
  usuarioId: string,
  cvuOAlias: string,
  monto: number,
  motivo: string,
  moneda: string,
) {
  const montoNum = validateTransferAmount(monto);
  const columnaSaldo = getBalanceColumn(moneda);
  const transaction = await sequelize.transaction();

  try {
    const origen = await getOriginAccount(
      usuarioId,
      transaction,
    );

    const destino = await getDestinationAccount(
      cvuOAlias,
      transaction,
    );

    if (origen.id === destino.id) {
      throw new Error('Auto-transferencia no permitida');
    }

    const saldoOrigen = Number(
      (origen as any)[columnaSaldo] ?? 0,
    );

    const saldoDestino = Number(
      (destino as any)[columnaSaldo] ?? 0,
    );

    if (saldoOrigen < montoNum) {
      throw new Error('Saldo insuficiente');
    }

    await updateAccountBalance(
      origen.id,
      columnaSaldo,
      saldoOrigen - montoNum,
      transaction,
    );

    await updateAccountBalance(
      destino.id,
      columnaSaldo,
      saldoDestino + montoNum,
      transaction,
    );

    const transferencia = await Transferencia.create(
      {
        cuenta_origen_id: origen.id,
        cuenta_destino_id: destino.id,
        monto: montoNum,
        moneda: moneda.toUpperCase(),
        motivo: motivo || 'Varias',
      },
      { transaction },
    );

    await transaction.commit();

    return transferencia;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}