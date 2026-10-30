import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middlewares/errorHandler';

describe('Manejo de errores internos', () => {
  it('no expone detalles internos en respuestas 500', async () => {
    const app = express();
    app.get('/error', (_req, _res, next) => {
      next(new Error('Detalle interno de la base de datos'));
    });
    app.use(errorHandler);

    const response = await request(app).get('/error');

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toBe('Error interno del servidor');
  });
});
