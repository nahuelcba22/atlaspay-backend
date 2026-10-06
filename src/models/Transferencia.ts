import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';
import { Cuenta } from './Cuenta';

interface TransferenciaAttributes {
  id: string;
  cuenta_origen_id: string;
  cuenta_destino_id: string;
  monto: number;
  moneda: string;
  motivo: string;
  fecha: Date;
}

interface TransferenciaCreationAttributes {
  id?: string;
  cuenta_origen_id: string;
  cuenta_destino_id: string;
  monto: number;
  moneda: string;
  motivo?: string;
  fecha?: Date;
}

export class Transferencia extends Model implements TransferenciaAttributes {
  declare public id: string;
  declare public cuenta_origen_id: string;
  declare public cuenta_destino_id: string;
  declare public monto: number;
  declare public moneda: string;
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
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    moneda: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'ARS',
      validate: {
        isIn: [['ARS', 'USD', 'EUR', 'PEN']],
      },
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
  },
);

// Relaciones para la cuenta que envía el dinero
Cuenta.hasMany(Transferencia, {
  as: 'transferenciasEnviadas',
  foreignKey: 'cuenta_origen_id',
});
Transferencia.belongsTo(Cuenta, {
  as: 'cuentaOrigen',
  foreignKey: 'cuenta_origen_id',
});

// Relaciones para la cuenta que recibe el dinero
Cuenta.hasMany(Transferencia, {
  as: 'transferenciasRecibidas',
  foreignKey: 'cuenta_destino_id',
});
Transferencia.belongsTo(Cuenta, {
  as: 'cuentaDestino',
  foreignKey: 'cuenta_destino_id',
});
