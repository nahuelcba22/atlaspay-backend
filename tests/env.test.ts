import { afterEach, describe, expect, it, vi } from 'vitest';

const originalPort = process.env.PORT;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalJwtSecret = process.env.JWT_SECRET;

afterEach(() => {
  if (originalPort === undefined) {
    delete process.env.PORT;
  } else {
    process.env.PORT = originalPort;
  }

  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }

  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }

  vi.resetModules();
});

describe('Configuración del puerto', () => {
  it.each(['-1', '3000.5', '65536', 'no-es-un-puerto', '1e3', '0x10'])(
    'rechaza el valor inválido %s',
    async (port) => {
      process.env.PORT = port;
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/test';
      process.env.JWT_SECRET = 'secret-test';

      await expect(import('../src/config/env')).rejects.toThrow(
        'PORT debe ser un entero entre 0 y 65535',
      );
    },
  );

  it('acepta valores con espacios alrededor y normaliza el puerto', async () => {
    process.env.PORT = ' 3000 ';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/test';
    process.env.JWT_SECRET = 'secret-test';

    const { env } = await import('../src/config/env');

    expect(env.PORT).toBe(3000);
  });
});
