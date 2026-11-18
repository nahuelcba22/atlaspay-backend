import { defineConfig } from 'vitest/config';

// Integration tests run against a real Postgres (see tests/integration/setup.ts).
// They use the .int.ts suffix so the default `npm test` does not pick them up.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.int.ts'],
    setupFiles: ['tests/integration/setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // One file at a time: they share the same database.
    fileParallelism: false,
  },
});