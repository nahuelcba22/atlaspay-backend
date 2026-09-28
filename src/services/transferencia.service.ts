import { sequelize } from '../db';
import { Cuenta } from '../models/Cuenta';
import { Transferencia } from '../models/Transferencia';
import { Op } from 'sequelize';

export const obtenerHistorial = async (usuarioId: number) => {
  const cuenta = await Cuenta.findOne({ where: { usuario_id: usuarioId } });
  if (!cuenta) throw new Error('Cuenta no encontrada');

  return await Transferencia.findAll({
    where: {
      [Op.or]: [
        { cuenta_origen_id: cuenta.id },
        { cuenta_destino_id: cuenta.id }
      ]
    },
    order: [['fecha', 'DESC']]
  });
};

export const procesarTransferencia = async (usuarioId: number, cvu_destino: string, monto: number, motivo: string) => {
  // 1. Aseguramos que el monto sea un número válido
  const montoNum = Number(monto);
  if (!montoNum || montoNum <= 0) throw new Error('Monto invalido');

  const t = await sequelize.transaction();
  try {
    const cuentaOrigen = await Cuenta.findOne({ where: { usuario_id: usuarioId }, transaction: t });
    if (!cuentaOrigen) throw new Error('Cuenta origen no encontrada');

    const cuentaDestino = await Cuenta.findOne({ where: { cvu: cvu_destino }, transaction: t });
    if (!cuentaDestino) throw new Error('Cuenta destino no encontrada');

    if (cuentaOrigen.id === cuentaDestino.id) throw new Error('Auto-transferencia no permitida');

    // 2. Extraemos los saldos de la columna correcta
    const saldoOrigen = Number((cuentaOrigen as any).saldo_ars ?? 0);
    const saldoDestino = Number((cuentaDestino as any).saldo_ars ?? 0);

    // 3. Validamos matemáticamente
    if (saldoOrigen < montoNum) throw new Error('Saldo insuficiente');

    // 4. Actualizamos la columna correcta
    await Cuenta.update(
      { saldo_ars: saldoOrigen - montoNum } as any,
      { where: { id: (cuentaOrigen as any).id }, transaction: t }
    );
    
    await Cuenta.update(
      { saldo_ars: saldoDestino + montoNum } as any,
      { where: { id: (cuentaDestino as any).id }, transaction: t }
    );
    
    await Cuenta.update(
      { saldo: saldoDestino + montoNum } as any,
      { where: { id: (cuentaDestino as any).id }, transaction: t }
    );

    const nuevaTransferencia = await Transferencia.create({
      cuenta_origen_id: (cuentaOrigen as any).id,
      cuenta_destino_id: (cuentaDestino as any).id,
      monto: montoNum,
      motivo: motivo || 'Varias'
    }, { transaction: t });

    await t.commit();
    return nuevaTransferencia;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};