import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

// Parses an env file without touching process.env.
function readEnvFile(name: string): Record<string, string> {
  const file = resolve(process.cwd(), name);
  return existsSync(file) ? dotenv.parse(readFileSync(file)) : {};
}

// Normalizes the host so a pooled endpoint ("-pooler") and its direct
// endpoint are recognized as the same database.
function hostOf(connectionString: string): string {
  return new URL(connectionString).host.replace('-pooler', '');
}

const testUrl = (
  process.env.DATABASE_URL_TEST ?? readEnvFile('.env.test').DATABASE_URL_TEST
)?.trim();

if (!testUrl) {
  throw new Error(
    'Falta DATABASE_URL_TEST (en .env.test o en el entorno). ' +
      'Los tests de integración nunca usan DATABASE_URL.',
  );
}

const testHost = hostOf(testUrl);

// Every DATABASE_URL this process could end up using.
const realUrls = [
  process.env.DATABASE_URL,
  readEnvFile('.env').DATABASE_URL,
].filter((value): value is string => Boolean(value?.trim()));

for (const realUrl of realUrls) {
  if (hostOf(realUrl) === testHost) {
    throw new Error(
      'DATABASE_URL_TEST apunta al mismo host que DATABASE_URL. ' +
        'Use una rama de Neon aislada para las pruebas.',
    );
  }
}

// env.ts calls dotenv.config(), which never overrides existing variables,
// so setting these here makes the app connect to the test database.
process.env.DATABASE_URL = testUrl;
process.env.JWT_SECRET ??= 'integration-test-secret';
process.env.TRANSACTION_EMAIL_URL = '';
process.env.INTEGRATION_DB_HOST = testHost;