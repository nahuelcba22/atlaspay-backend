import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db';

// 1. Definimos la estructura de datos para TypeScript
interface UsuarioAttributes {
  id: string;
  nombre: string;
  email: string;
  password_hash: string;
  fecha_registro: Date;
}

// 2. Definimos qué campos son opcionales al CREAR un usuario (id y fecha se autogeneran)
interface UsuarioCreationAttributes
  extends Optional<UsuarioAttributes, 'id' | 'fecha_registro'> {}

// 3. Creamos la clase del modelo
export class Usuario extends Model implements UsuarioAttributes {
  public id!: string;
  public nombre!: string;
  public email!: string;
  public password_hash!: string;
  public readonly fecha_registro!: Date;
}

// 4. Inicializamos las columnas de la base de datos
Usuario.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fecha_registro: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'usuarios',
    timestamps: false, 
  }
);