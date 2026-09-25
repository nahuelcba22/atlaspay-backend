import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';
import { Cuenta } from './Cuenta';

interface TransferenciaAttributes {
  id: string;
  cuenta_origen_id: string;
  cuenta_destino_id: string;
  monto: number;
  motivo: string;
  fecha: Date;
}

interface TransferenciaCreationAttributes {
  id?: string;
  cuenta_origen_id: string;
  cuenta_destino_id: string;
  monto: number;
  motivo?: string;
  fecha?: Date;
}

export class Transferencia extends Model implements TransferenciaAttributes {
  public declare id: string;
  public declare cuenta_origen_id: string;
  public declare cuenta_destino_id: string;
  public declare monto: number;
  public declare motivo: string;
  public declare readonly fecha: Date;
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
      references: {
        model: Cuenta,
        key: 'id',
      },
    },
    cuenta_destino_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Cuenta,
        key: 'id',
      },
    },
    monto: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
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
  }
);