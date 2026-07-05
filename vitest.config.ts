import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // The access-matrix audit needs live credentials + a running server; it is
    // never part of `npm test` / CI. Run it with `npm run test:access`.
    exclude: ['tests/access/**', 'node_modules/**'],
    // Dummy values so modules that read env at import time (lib/supabase.ts,
    // lib/unsubscribe.ts) can load. Tests never talk to a real Supabase.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      UNSUBSCRIBE_SECRET: 'test-unsubscribe-secret',
    },
  },
})
