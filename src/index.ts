import express from 'express';
import type { Application, Request, Response } from 'express'; // <-- Agregamos "type" aquí
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

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

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});