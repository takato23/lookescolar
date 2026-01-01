import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';

// Flat config (ESLint 9). Keep rules relaxed to avoid noise, but load plugins so
// inline disables and legacy comments resolve without "rule not found".
export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'coverage/**',
      'test-reports/**',
      'supabase/.temp/**',
      '.next.backup/**',
      'public/**',
      'backups/**', // do not lint snapshot backups
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      '@next/next': nextPlugin,
    },
    rules: {
      // React hooks
      ...reactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',

      // React refresh
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Next.js rules (keep light; avoid blocking builds)
      '@next/next/no-img-element': 'off',

      // TS relaxations to reduce noise
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',

      // General relaxations to unblock legacy code
      'no-empty': 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'no-control-regex': 'off',
      'no-constant-condition': 'off',
      'no-prototype-builtins': 'off',
      'no-empty-pattern': 'off',
      'no-async-promise-executor': 'off',
      'prefer-const': 'off',
    },
  },
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '__tests__/**/*.{ts,tsx}',
      'tests/**/*.{ts,tsx}',
      'vitest.setup.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  }
);
