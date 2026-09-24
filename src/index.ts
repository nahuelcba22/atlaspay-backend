import express from 'express';
import type { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { sequelize } from './db'; 
import { Usuario } from './models/Usuario';
import { Cuenta } from './models/Cuenta';
// Cargar variables de entorno
dotenv.config();

const app: Application = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Ruta de prueba
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ message: '¡Servidor de Atlaspay funcionando correctamente!' });
});

// Ruta para crear un usuario de prueba
app.post('/api/usuarios', async (req: Request, res: Response) => {
  try {
    const { nombre, email, password_hash } = req.body;
    
    // Le pedimos a Sequelize que lo guarde en Render
    const nuevoUsuario = await Usuario.create({
      nombre,
      email,
      password_hash
    });

    res.status(201).json({
      message: '¡Usuario creado con éxito!',
      data: nuevoUsuario
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Hubo un problema al crear el usuario' });
  }
});

// Sincronizar y levantar servidor (Un solo bloque)
sequelize.sync({ alter: true }) 
  .then(() => {
    console.log(' Base de datos sincronizada correctamente.');
    app.listen(port, () => {
      console.log(` Servidor corriendo en http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error(' Error al sincronizar la base de datos:', error);
  });