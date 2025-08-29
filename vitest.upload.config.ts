import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    // Focus on upload-related tests
    include: [
      '__tests__/integration/admin-photos-upload-chain.test.ts',
      '__tests__/integration/admin-assets-api.test.ts',
      '__tests__/integration/folder-photo-mapping.test.ts',
      '__tests__/integration/admin-folders-api.test.ts',
      '__tests__/api/admin/photos/upload.test.ts',
      '__tests__/api/admin/photos/upload-enhanced.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage/upload',
      include: [
        'app/api/admin/photos/**',
        'app/api/admin/assets/**',
        'app/api/admin/folders/**',
        'lib/services/storage.ts',
        'lib/services/watermark.ts',
        'lib/services/free-tier-optimizer.ts',
        'lib/services/photo.service.ts',
        'lib/services/folder.service.ts',
      ],
      exclude: ['node_modules/**', '__tests__/**', 'coverage/**', '*.config.*'],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    logHeapUsage: true,
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-results/upload-tests.json',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
