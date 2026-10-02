import { sequelize } from '../db';
import { Cuenta } from '../models/Cuenta';
import { Transferencia } from '../models/Transferencia';
import { Op } from 'sequelize';

const getColumnaSaldo = (moneda: string) => {
  const mapeo: { [key: string]: string } = {
    'ARS': 'saldo_ars',
    'USD': 'saldo_usd',
    'EUR': 'saldo_eur',
    'PEN': 'saldo_pen'
  };
  return mapeo[moneda.toUpperCase()];
};

export const obtenerHistorial = async (usuarioId: string) => {
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

export const procesarTransferencia = async (
  usuarioId: string, 
  cvu_destino: string, 
  monto: number, 
  motivo: string,
  moneda: string
) => {
  // 1. Aseguramos que el monto sea un número válido
  const montoNum = Number(monto);
  if (!montoNum || montoNum <= 0) throw new Error('Monto invalido');

  const columnaSaldo = getColumnaSaldo(moneda);
  if (!columnaSaldo) throw new Error('Moneda invalida');

  const t = await sequelize.transaction();
  try {
    // Bloqueamos las filas durante la transacción para evitar doble gasto en concurrencia
    const cuentaOrigen = await Cuenta.findOne({ 
      where: { usuario_id: usuarioId }, 
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!cuentaOrigen) throw new Error('Cuenta origen no encontrada');

    const cuentaDestino = await Cuenta.findOne({ 
      where: { cvu: cvu_destino }, 
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!cuentaDestino) throw new Error('Cuenta destino no encontrada');

    if (cuentaOrigen.id === cuentaDestino.id) throw new Error('Auto-transferencia no permitida');

    // 2. Extraemos los saldos de la columna correcta de forma dinámica
    const saldoOrigen = Number((cuentaOrigen as any)[columnaSaldo] ?? 0);
    const saldoDestino = Number((cuentaDestino as any)[columnaSaldo] ?? 0);

    // 3. Validamos matemáticamente
    if (saldoOrigen < montoNum) throw new Error('Saldo insuficiente');

    // 4. Actualizamos la columna correcta
    await Cuenta.update(
      { [columnaSaldo]: saldoOrigen - montoNum } as any,
      { where: { id: (cuentaOrigen as any).id }, transaction: t }
    );
    
    await Cuenta.update(
      { [columnaSaldo]: saldoDestino + montoNum } as any,
      { where: { id: (cuentaDestino as any).id }, transaction: t }
    );

    const nuevaTransferencia = await Transferencia.create({
      cuenta_origen_id: (cuentaOrigen as any).id,
      cuenta_destino_id: (cuentaDestino as any).id,
      monto: montoNum,
      moneda: moneda.toUpperCase(),
      motivo: motivo || 'Varias'
    }, { transaction: t });

    await t.commit();
    return nuevaTransferencia;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};