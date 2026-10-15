import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import usuariosRoutes from './routes/usuarios.routes';
import cuentasRoutes from './routes/cuentas.routes';
import transferenciasRoutes from './routes/transferencias.routes';
import exchangeRoutes from './routes/exchange.routes';
import botRoutes from './routes/bot.routes';
import adminRoutes from './routes/admin.routes';

import profileRoutes from './routes/profile.routes';
import historialRoutes from './routes/historial.routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';

// Registra las relaciones entre modelos antes de usar las rutas.
import './models/associations';

const app = express();

app.disable('x-powered-by');
app.use(requestLogger);
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use('/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Demasiadas peticiones desde esta IP. Intenta nuevamente más tarde.',
    },
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req: any, res: any) => {
  res.status(200).json({ message: 'Servidor de Atlaspay funcionando correctamente' });
});

app.use('/api/bot', botRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/cuentas', cuentasRoutes);
app.use('/api/transferencias', transferenciasRoutes);
app.use('/api/exchange', exchangeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/historial', historialRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;