import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';
import { Usuario } from './Usuario'; 

interface CuentaAttributes {
  id: string;
  usuario_id: string;
  cvu: string;
  alias: string;
  saldo_ars: number;
  saldo_usd: number;
  saldo_eur: number;
  saldo_pen: number;
  estado: string;
}

interface CuentaCreationAttributes {
  id?: string;
  usuario_id: string;
  cvu: string;
  alias: string;
  saldo_ars?: number;
  saldo_usd?: number;
  saldo_eur?: number;
  saldo_pen?: number;
  estado?: string;
}

export class Cuenta extends Model implements CuentaAttributes {
  public declare id: string;
  public declare usuario_id: string;
  public declare cvu: string;
  public declare alias: string;
  public declare saldo_ars: number;
  public declare saldo_usd: number;
  public declare saldo_eur: number;
  public declare saldo_pen: number;
  public declare estado: string;
}

Cuenta.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: Usuario,
        key: 'id',
      },
    },
    cvu: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    alias: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    saldo_ars: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    saldo_usd: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    saldo_eur: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    saldo_pen: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'activa',
    },
  },
  {
    sequelize,
    tableName: 'cuentas',
    timestamps: false,
  }
);

Usuario.hasOne(Cuenta, { foreignKey: 'usuario_id' });
Cuenta.belongsTo(Usuario, { foreignKey: 'usuario_id' });