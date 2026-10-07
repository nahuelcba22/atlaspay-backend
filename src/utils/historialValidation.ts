import { TIPOS_MOVIMIENTO, type TipoMovimiento } from '../models/Transferencia';

const DIRECCIONES = ['ENVIADA', 'RECIBIDA'] as const;
const MONEDAS = ['ARS', 'PEN', 'USD', 'EUR'] as const;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export type Direccion = (typeof DIRECCIONES)[number];

export interface HistorialFiltros {
  tipo?: TipoMovimiento;
  direccion?: Direccion;
  moneda?: string;
  desde?: Date;
  hastaExclusivo?: Date;
  page: number;
  limit: number;
}

// Lee un parámetro de texto; rechaza valores repetidos o vacíos.
function readParam(query: Record<string, unknown>, name: string) {
  const value = query[name];

  if (value === undefined) return undefined;

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`El parámetro ${name} es inválido`);
  }

  return value.trim();
}

function readEnum<T extends string>(
  query: Record<string, unknown>,
  name: string,
  allowed: readonly T[],
): T | undefined {
  const value = readParam(query, name)?.toUpperCase();

  if (value !== undefined && !allowed.includes(value as T)) {
    throw new Error(`${name} debe ser uno de: ${allowed.join(', ')}`);
  }

  return value as T | undefined;
}

// Acepta solo fechas YYYY-MM-DD reales y las interpreta en UTC.
function readDate(query: Record<string, unknown>, name: string) {
  const value = readParam(query, name);

  if (value === undefined) return undefined;

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(date.getTime()) ||
    !date.toISOString().startsWith(value)
  ) {
    throw new Error(`${name} debe ser una fecha válida con formato YYYY-MM-DD`);
  }

  return date;
}

function readInt(query: Record<string, unknown>, name: string, def: number, max?: number) {
  const value = readParam(query, name);

  if (value === undefined) return def;

  const parsed = Number(value);

  if (!/^\d+$/.test(value) || parsed < 1 || (max !== undefined && parsed > max)) {
    const rango = max ? `entre 1 y ${max}` : 'mayor o igual a 1';
    throw new Error(`${name} debe ser un número entero ${rango}`);
  }

  return parsed;
}

// Valida y normaliza los filtros del historial unificado.
export function validateHistorialQuery(query: Record<string, unknown>): HistorialFiltros {
  const desde = readDate(query, 'desde');
  const hasta = readDate(query, 'hasta');

  if (desde && hasta && desde > hasta) {
    throw new Error('desde no puede ser posterior a hasta');
  }

  return {
    tipo: readEnum(query, 'tipo', TIPOS_MOVIMIENTO),
    direccion: readEnum(query, 'direccion', DIRECCIONES),
    moneda: readEnum(query, 'moneda', MONEDAS),
    desde,
    // hasta es inclusivo: se filtra hasta el inicio del día siguiente.
    hastaExclusivo: hasta && new Date(hasta.getTime() + 24 * 60 * 60 * 1000),
    page: readInt(query, 'page', 1),
    limit: readInt(query, 'limit', DEFAULT_LIMIT, MAX_LIMIT),
  };
}
