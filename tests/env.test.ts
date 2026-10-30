import { afterEach, describe, expect, it, vi } from 'vitest';

const originalPort = process.env.PORT;

afterEach(() => {
  if (originalPort === undefined) {
    delete process.env.PORT;
  } else {
    process.env.PORT = originalPort;
  }
  vi.resetModules();
});

describe('Configuración del puerto', () => {
  it.each(['-1', '3000.5', '65536', 'no-es-un-puerto'])(
    'rechaza el valor inválido %s',
    async (port) => {
      process.env.PORT = port;

      await expect(import('../src/config/env')).rejects.toThrow(
        'PORT debe ser un entero entre 0 y 65535',
      );
    },
  );
});
