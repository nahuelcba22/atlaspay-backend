import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/middlewares/errorHandler';
import { AppError } from '../src/utils/appError';

// Builds an app whose only route forwards the given error to the handler.
function buildApp(error: unknown) {
  const app = express();
  app.get('/error', (_req, _res, next) => {
    next(error);
  });
  app.use(errorHandler);
  return app;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Manejo de errores internos', () => {
  it('no expone detalles internos en respuestas 500', async () => {
    const app = buildApp(new Error('Detalle interno de la base de datos'));

    const response = await request(app).get('/error');

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toBe('Error interno del servidor');
  });
});

describe('Manejo de AppError', () => {
  it.each([
    [400, 'Saldo insuficiente'],
    [403, 'La cuenta no está activa'],
    [404, 'Cuenta no encontrada'],
  ])('responde %s con el mensaje del error', async (status, message) => {
    const app = buildApp(new AppError(message, status));

    const response = await request(app).get('/error');

    expect(response.statusCode).toBe(status);
    expect(response.body.error).toBe(message);
  });

  it('usa 400 por defecto', async () => {
    const app = buildApp(new AppError('Monto inválido'));

    const response = await request(app).get('/error');

    expect(response.statusCode).toBe(400);
  });

  it('oculta el mensaje de un AppError con status 5xx', async () => {
    const app = buildApp(new AppError('Valor decimal inválido', 500));

    const response = await request(app).get('/error');

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toBe('Error interno del servidor');
  });

  it('propaga un AppError lanzado desde un handler async (Express 5)', async () => {
    const app = express();
    app.get('/async', async () => {
      throw new AppError('Saldo insuficiente', 400);
    });
    app.use(errorHandler);

    const response = await request(app).get('/async');

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Saldo insuficiente');
  });
});

describe('Compatibilidad y casos límite', () => {
  it('sigue respetando statusCode en errores que no son AppError', async () => {
    const error = Object.assign(new Error('Payload demasiado grande'), {
      statusCode: 413,
    });
    const app = buildApp(error);

    const response = await request(app).get('/error');

    expect(response.statusCode).toBe(413);
    expect(response.body.error).toBe('Payload demasiado grande');
  });

  it('responde 400 ante JSON malformado en el body', async () => {
    const app = express();
    app.use(express.json());
    app.post('/json', (_req, res) => {
      res.sendStatus(200);
    });
    app.use(errorHandler);

    const response = await request(app)
      .post('/json')
      .set('Content-Type', 'application/json')
      .send('{"monto": ');

    expect(response.statusCode).toBe(400);
  });

  it.each([200, 302, 99, 600, 400.5])(
    'ignora un statusCode fuera de 400-599 (%s)',
    async (statusCode) => {
      const app = buildApp(Object.assign(new Error('x'), { statusCode }));

      const response = await request(app).get('/error');

      expect(response.statusCode).toBe(500);
    },
  );

    // `next(null)` means "no error" in Express, so truthy non-Error values are used.
  it.each([['cadena suelta'], [{ code: 'X' }], [42]])(
    'responde 500 genérico si se lanza algo que no es un Error (%o)',
    async (thrown) => {
      const app = buildApp(thrown);

      const response = await request(app).get('/error');

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Error interno del servidor');
    },
  );
  it('omite el stack en producción', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const app = buildApp(new AppError('Saldo insuficiente', 400));

    const response = await request(app).get('/error');

    expect(response.body).not.toHaveProperty('stack');
  });

  it('incluye el stack fuera de producción', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const app = buildApp(new AppError('Saldo insuficiente', 400));

    const response = await request(app).get('/error');

    expect(response.body).toHaveProperty('stack');
  });
});