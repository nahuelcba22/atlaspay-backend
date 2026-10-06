import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import usuariosRoutes from './routes/usuarios.routes';
import cuentasRoutes from './routes/cuentas.routes';
import transferenciasRoutes from './routes/transferencias.routes';
import exchangeRoutes from './routes/exchange.routes';
import botRoutes from './routes/bot.routes';
import adminRoutes from './routes/admin.routes'; // <-- 1. Importas las nuevas rutas

const app = express();

app.use('/api/bot', botRoutes);
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (req: any, res: any) => {
  res.status(200).json({ message: 'Servidor de Atlaspay funcionando correctamente' });
});

app.use('/api/usuarios', usuariosRoutes);
app.use('/api/cuentas', cuentasRoutes);
app.use('/api/transferencias', transferenciasRoutes);
app.use('/api/exchange', exchangeRoutes);
app.use('/api/admin', adminRoutes); // <-- 2. Conectas la ruta para el dashboard

export default app;