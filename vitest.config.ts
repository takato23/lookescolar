import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load environment variables based on mode, e.g. .env.test.local, .env.test, .env.local, .env
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    test: {
      env: {
        NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'stub',
        SUPABASE_URL: env.SUPABASE_URL || 'http://localhost:54321',
        SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY || 'stub',
      },

      environment: 'jsdom',
      include: [
        'tests/**/*.test.ts',
        'tests/**/*.test.tsx',
        '__tests__/**/*.test.ts',
        '__tests__/**/*.test.tsx',
      ],
      exclude: ['node_modules', 'dist', '.next', 'coverage'],
      setupFiles: [],
      globals: true,
      css: true,
      reporters: ['default'],
      // Usar entorno Node para tests de integración
      environmentMatchGlobs: [['tests/integration/**', 'node']],
      coverage: {
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'dist/',
          '.next/',
          'coverage/',
          '*.config.*',
          'types/',
          'scripts/',
        ],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
        'server-only': path.resolve(
          __dirname,
          './tests/mocks/server-only.ts'
        ),
      },
    },
  };
});
