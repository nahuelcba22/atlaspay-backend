import express from 'express';
import type { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { sequelize } from './db'; 
import { Usuario } from './models/Usuario';
import { Cuenta } from './models/Cuenta';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validarToken, AuthRequest } from './middlewares/validarToken';

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Servidor de Atlaspay funcionando correctamente' });
});

// Ruta de Register
app.post('/api/usuarios', async (req: Request, res: Response) => {
  try {
    const { nombre, email, password } = req.body;
    
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const nuevoUsuario = await Usuario.create({
      nombre,
      email,
      password_hash: hashedPassword 
    });

    const cvuAleatorio = Math.random().toString().slice(2, 22).padEnd(22, '0');
    const aliasAleatorio = nombre.toLowerCase().replace(/\s/g, '') + '.' + Math.floor(Math.random() * 1000) + '.atlas';

    const nuevaCuenta = await Cuenta.create({
      usuario_id: nuevoUsuario.id,
      cvu: cvuAleatorio,
      alias: aliasAleatorio
    });

    res.status(201).json({
      message: 'Usuario y cuenta creados con exito',
      data: {
        usuario: {
          id: nuevoUsuario.id,
          nombre: nuevoUsuario.nombre,
          email: nuevoUsuario.email
        },
        cuenta: {
          cvu: nuevaCuenta.cvu,
          alias: nuevaCuenta.alias,
          saldo: nuevaCuenta.saldo
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Hubo un problema al crear el usuario y la cuenta' });
  }
});

// Ruta para Login 
app.post('/api/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const usuario = await Usuario.findOne({ where: { email } });
    
    if (!usuario) {
      res.status(401).json({ error: 'Credenciales invalidas' });
      return;
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    
    if (!passwordValido) {
      res.status(401).json({ error: 'Credenciales invalidas' });
      return;
    }

    // Generamos el Token de seguridad
    const firmaSecreta = process.env.JWT_SECRET || 'clave_super_secreta_de_desarrollo';
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      firmaSecreta,
      { expiresIn: '24h' } 
    );

    res.status(200).json({
      message: 'Login exitoso',
      token: token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Hubo un problema al intentar iniciar sesion' });
  }
});
// Ruta Privada: Obtener los datos de mi cuenta
app.get('/api/mi-cuenta', validarToken, async (req: AuthRequest, res: Response) => {
  try {
    // req.usuario.id viene del token decodificado por el middleware
    const cuenta = await Cuenta.findOne({ where: { usuario_id: req.usuario.id } });

    if (!cuenta) {
      res.status(404).json({ error: 'Cuenta no encontrada' });
      return;
    }

    res.status(200).json({
      message: 'Datos de la cuenta obtenidos exitosamente',
      cuenta: {
        cvu: cuenta.cvu,
        alias: cuenta.alias,
        saldo: cuenta.saldo,
        estado: cuenta.estado
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la cuenta' });
  }
});

sequelize.sync({ alter: true }) 
  .then(() => {
    console.log('Base de datos sincronizada correctamente.');
    app.listen(port, () => {
      console.log(`Servidor corriendo en http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Error al sincronizar la base de datos:', error);
  });