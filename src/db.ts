import { Sequelize } from 'sequelize';
import { env } from './config/env';
import { buildSslOptions } from './config/dbSsl';

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    // env.ts has already loaded .env by this point.
    ssl: buildSslOptions(process.env.DB_SSL_REJECT_UNAUTHORIZED),
  },
});