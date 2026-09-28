import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import usuariosRoutes from './routes/usuarios.routes';
import cuentasRoutes from './routes/cuentas.routes';
import transferenciasRoutes from './routes/transferencias.routes';
import exchangeRoutes from './routes/exchange.routes'; // <-- 1. AGREGÁ ESTA LÍNEA

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (req: any, res: any) => {
  res.status(200).json({ message: 'Servidor de Atlaspay funcionando correctamente' });
});

app.use('/api/usuarios', usuariosRoutes);
app.use('/api/cuentas', cuentasRoutes);
app.use('/api/transferencias', transferenciasRoutes);
app.use('/api/exchange', exchangeRoutes); // <-- 2. Y AGREGÁ ESTA LÍNEA

export default app;