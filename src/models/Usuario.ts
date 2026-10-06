import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';

interface UsuarioAttributes {
  id: string;
  nombre: string;
  email: string;
  password_hash: string;
  role: string;
  fecha_registro: Date;
}

interface UsuarioCreationAttributes {
  id?: string;
  nombre: string;
  email: string;
  password_hash: string;
  role?: string; //
  fecha_registro?: Date;
}

// 3. Creamos la clase del modelo
export class Usuario extends Model implements UsuarioAttributes {
  public declare id: string;
  public declare nombre: string;
  public declare email: string;
  public declare password_hash: string;
  public declare role: string;
  public declare readonly fecha_registro: Date;
}

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
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: false,
      defaultValue: 'user',
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