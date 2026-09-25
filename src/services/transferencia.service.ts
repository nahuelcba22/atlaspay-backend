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
  if (!monto || monto <= 0) throw new Error('Monto invalido');

  const t = await sequelize.transaction();
  try {
    const cuentaOrigen = await Cuenta.findOne({ where: { usuario_id: usuarioId }, transaction: t });
    if (!cuentaOrigen) throw new Error('Cuenta origen no encontrada');

    const cuentaDestino = await Cuenta.findOne({ where: { cvu: cvu_destino }, transaction: t });
    if (!cuentaDestino) throw new Error('Cuenta destino no encontrada');

    if (cuentaOrigen.id === cuentaDestino.id) throw new Error('Auto-transferencia no permitida');
    if (cuentaOrigen.saldo < monto) throw new Error('Saldo insuficiente');

    cuentaOrigen.saldo = Number(cuentaOrigen.saldo) - Number(monto);
    cuentaDestino.saldo = Number(cuentaDestino.saldo) + Number(monto);

    await cuentaOrigen.save({ transaction: t });
    await cuentaDestino.save({ transaction: t });

    const nuevaTransferencia = await Transferencia.create({
      cuenta_origen_id: cuentaOrigen.id,
      cuenta_destino_id: cuentaDestino.id,
      monto: monto,
      motivo: motivo || 'Varias'
    }, { transaction: t });

    await t.commit();
    return nuevaTransferencia;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};