import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';
import { Cuenta } from './Cuenta';

export const TIPOS_MOVIMIENTO = ['TRANSFERENCIA', 'CAMBIO', 'COMPRA', 'VENTA'] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

const MONEDAS = ['ARS', 'USD', 'EUR', 'PEN'];

export class Transferencia extends Model {
  declare public id: string;
  declare public cuenta_origen_id: string;
  declare public cuenta_destino_id: string;
  declare public tipo: TipoMovimiento;
  declare public monto: number;
  declare public moneda: string;
  declare public monto_destino: number | null;
  declare public moneda_destino: string | null;
  declare public tasa: number | null;
  declare public motivo: string;
  declare public readonly fecha: Date;
}

Transferencia.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cuenta_origen_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Cuenta, key: 'id' },
    },
    cuenta_destino_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Cuenta, key: 'id' },
    },
    // Distingue transferencias de operaciones de exchange.
    tipo: {
      type: DataTypes.ENUM(...TIPOS_MOVIMIENTO),
      allowNull: false,
      defaultValue: 'TRANSFERENCIA',
    },
    monto: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    moneda: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'ARS',
      validate: { isIn: [MONEDAS] },
    },
    // Datos del lado que entra en un exchange; null en transferencias.
    monto_destino: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    moneda_destino: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isIn: [MONEDAS] },
    },
    tasa: {
      type: DataTypes.DECIMAL(18, 8),
      allowNull: true,
    },
    motivo: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Transferencia',
    },
    fecha: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'transferencias',
    timestamps: false,
    // Acelera el historial por cuenta ordenado por fecha.
    indexes: [
      { fields: ['cuenta_origen_id', 'fecha'] },
      { fields: ['cuenta_destino_id', 'fecha'] },
    ],
  },
);
