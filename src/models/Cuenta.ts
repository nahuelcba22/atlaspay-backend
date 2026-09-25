import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';
import { Usuario } from './Usuario'; 

// 1. Definimos la estructura de datos
interface CuentaAttributes {
  id: string;
  usuario_id: string;
  cvu: string;
  alias: string;
  saldo: number;
  estado: string;
}

// 2. Campos opcionales al crear
interface CuentaCreationAttributes {
  id?: string;
  usuario_id: string;
  cvu: string;
  alias: string;
  saldo?: number;
  estado?: string;
}

// 3. Creamos la clase (ESTO ES LO QUE FALTABA)
export class Cuenta extends Model implements CuentaAttributes {
  public declare id: string;
  public declare usuario_id: string;
  public declare cvu: string;
  public declare alias: string;
  public declare saldo: number;
  public declare estado: string;
}

// 4. Inicializamos las columnas
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
    saldo: {
      type: DataTypes.DECIMAL(10, 2),
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

// 5. Establecemos la Relacion 1 a 1
Usuario.hasOne(Cuenta, { foreignKey: 'usuario_id' });
Cuenta.belongsTo(Usuario, { foreignKey: 'usuario_id' });