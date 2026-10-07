import type { Transferencia } from '../models/Transferencia';
import type { Direccion } from './historialValidation';

interface CuentaConUsuario {
  cvu: string;
  alias: string;
  Usuario?: { nombre: string } | null;
}

export type FilaHistorial = Transferencia & {
  cuentaOrigen?: CuentaConUsuario | null;
  cuentaDestino?: CuentaConUsuario | null;
};

// Los DECIMAL llegan como string desde Postgres.
function toNumberOrNull(value: unknown) {
  return value === null || value === undefined ? null : Number(value);
}

// Convierte una fila de la base en un movimiento visto por el usuario.
export function toMovimiento(fila: FilaHistorial, cuentaId: string) {
  const esExchange = fila.tipo !== 'TRANSFERENCIA';
  const enviada = fila.cuenta_origen_id === cuentaId;
  const direccion: Direccion = esExchange || enviada ? 'ENVIADA' : 'RECIBIDA';

  // La contraparte es siempre la otra cuenta, nunca la del usuario.
  const otraCuenta = enviada ? fila.cuentaDestino : fila.cuentaOrigen;

  return {
    id: fila.id,
    tipo: fila.tipo,
    direccion,
    monto: Number(fila.monto),
    moneda: fila.moneda,
    monto_destino: toNumberOrNull(fila.monto_destino),
    moneda_destino: fila.moneda_destino ?? null,
    tasa: toNumberOrNull(fila.tasa),
    contraparte:
      esExchange || !otraCuenta
        ? null
        : {
            nombre: otraCuenta.Usuario?.nombre ?? null,
            cvu: otraCuenta.cvu,
            alias: otraCuenta.alias,
          },
    // En exchange el motivo lo genera el sistema, no el usuario.
    motivo: esExchange ? null : (fila.motivo ?? null),
    fecha: new Date(fila.fecha).toISOString(),
  };
}
