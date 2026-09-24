import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db';
import { Usuario } from './Usuario'; // Traemos al Usuario para poder vincularlo

// Definimos la estructura de datos
interface CuentaAttributes {
  id: string;
  usuario_id: string;
  cvu: string;
  alias: string;
  saldo: number;
  estado: string;
}

// Campos opcionales al crear
interface CuentaCreationAttributes extends Optional<CuentaAttributes, 'id' | 'saldo' | 'estado'> {}

// Creamos la clase
export class Cuenta extends Model implements CuentaAttributes {
  public id!: string;
  public usuario_id!: string;
  public cvu!: string;
  public alias!: string;
  public saldo!: number;
  public estado!: string;
}

// Inicializamos las columnas
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
      unique: true, // Esto asegura que un usuario no pueda tener más de una cuenta
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

// Establecemos la Relación 1 a 1
Usuario.hasOne(Cuenta, { foreignKey: 'usuario_id' });
Cuenta.belongsTo(Usuario, { foreignKey: 'usuario_id' });