import app from './app';
import { sequelize } from './db';
import { env } from './config/env';

// Sincronización y arranque.
sequelize
  .sync({ alter: true })
  .then(() => {
    console.log('Base de datos sincronizada correctamente.');

    app.listen(env.PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${env.PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error al sincronizar la base de datos:', error);
  });