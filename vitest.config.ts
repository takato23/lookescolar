import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
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
});
