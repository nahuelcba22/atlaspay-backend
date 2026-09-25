import { DataTypes, Model } from 'sequelize';
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
interface UsuarioCreationAttributes {
  id?: string;
  nombre: string;
  email: string;
  password_hash: string;
  fecha_registro?: Date;
}

// 3. Creamos la clase del modelo
export class Usuario extends Model<UsuarioAttributes, UsuarioCreationAttributes> implements UsuarioAttributes {
  public declare id: string;
  public declare nombre: string;
  public declare email: string;
  public declare password_hash: string;
  public declare readonly fecha_registro: Date;
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