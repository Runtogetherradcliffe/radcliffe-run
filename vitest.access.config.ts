import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Dedicated config for the role-matrix access audit (tests/access).
 * Separate from vitest.config.ts because this suite talks to a REAL Supabase
 * project and a running dev server - it must never run in `npm test` / CI.
 * Run with: npm run test:access
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  test: {
    include: ['tests/access/**/*.test.ts'],
    // Enable the suite (the file self-guards on ACCESS_AUDIT so it stays inert
    // anywhere else). Real credentials are read from .env.local by the test.
    env: {
      ACCESS_AUDIT: '1',
    },
    hookTimeout: 120_000,
    testTimeout: 30_000,
    fileParallelism: false,
  },
})
