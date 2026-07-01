import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // The in-memory MongoDB binary can take a moment to spin up on first run.
    hookTimeout: 120_000,
    testTimeout: 30_000,
    include: ['tests/**/*.test.ts'],
  },
});
