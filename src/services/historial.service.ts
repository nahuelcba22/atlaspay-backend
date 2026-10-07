import { Op, type WhereOptions } from 'sequelize';
import { Cuenta } from '../models/Cuenta';
import { Transferencia } from '../models/Transferencia';
import { Usuario } from '../models/Usuario';
import { toMovimiento, type FilaHistorial } from '../utils/historialMapper';
import type { HistorialFiltros } from '../utils/historialValidation';

// Trae solo los datos públicos de la cuenta y su titular.
function includeCuenta(as: 'cuentaOrigen' | 'cuentaDestino') {
  return {
    model: Cuenta,
    as,
    attributes: ['cvu', 'alias'],
    include: [{ model: Usuario, attributes: ['nombre'] }],
  };
}

// Arma las condiciones; siempre limitadas a la cuenta del usuario.
function buildWhere(cuentaId: string, filtros: HistorialFiltros): WhereOptions {
  const condiciones: WhereOptions[] = [
    {
      [Op.or]: [
        { cuenta_origen_id: cuentaId },
        { cuenta_destino_id: cuentaId },
      ],
    },
  ];

  if (filtros.tipo) condiciones.push({ tipo: filtros.tipo });

  // Un exchange es un único registro y se considera siempre ENVIADA.
  if (filtros.direccion === 'ENVIADA') {
    condiciones.push({ cuenta_origen_id: cuentaId });
  }

  if (filtros.direccion === 'RECIBIDA') {
    condiciones.push({ cuenta_destino_id: cuentaId, tipo: 'TRANSFERENCIA' });
  }

  if (filtros.moneda) {
    condiciones.push({
      [Op.or]: [{ moneda: filtros.moneda }, { moneda_destino: filtros.moneda }],
    });
  }

  if (filtros.desde) condiciones.push({ fecha: { [Op.gte]: filtros.desde } });

  if (filtros.hastaExclusivo) {
    condiciones.push({ fecha: { [Op.lt]: filtros.hastaExclusivo } });
  }

  return { [Op.and]: condiciones };
}

// Obtiene el historial unificado paginado del usuario.
export async function obtenerMovimientos(usuarioId: string, filtros: HistorialFiltros) {
  const cuenta = await Cuenta.findOne({ where: { usuario_id: usuarioId } });

  if (!cuenta) {
    throw new Error('Cuenta no encontrada');
  }

  const { rows, count } = await Transferencia.findAndCountAll({
    where: buildWhere(cuenta.id, filtros),
    include: [includeCuenta('cuentaOrigen'), includeCuenta('cuentaDestino')],
    order: [
      ['fecha', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: filtros.limit,
    offset: (filtros.page - 1) * filtros.limit,
  });

  return {
    movimientos: rows.map((fila) => toMovimiento(fila as FilaHistorial, cuenta.id)),
    pagination: {
      page: filtros.page,
      limit: filtros.limit,
      total: count,
      totalPages: Math.ceil(count / filtros.limit),
    },
  };
}
