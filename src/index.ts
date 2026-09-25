import app from './app';
import dotenv from 'dotenv';
import { sequelize } from './db';

dotenv.config();

const port = process.env.PORT || 3000;

// Sincronización y arranque
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