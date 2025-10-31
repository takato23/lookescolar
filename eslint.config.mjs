import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import nextPlugin from '@next/eslint-plugin-next';

// Nota: Evitamos depender de plugins opcionales (prettier) durante builds en CI/Vercel
export default [
  { files: ['**/*.{js,mjs,cjs,ts,tsx}'] },
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
  },
  { languageOptions: { globals: { browser: true, es6: true, node: true } } },
  js.configs.recommended,
  // Config mínima para evitar ruido en CI (sin eslint-config-prettier)
  {
    plugins: {
      '@typescript-eslint': tseslint,
      '@next/next': nextPlugin,
    },
  },
  {
    rules: {
      // Reglas básicas (sin integrar prettier como plugin)
      'no-console': 'warn',
      // Rely on @typescript-eslint versions instead
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      '@typescript-eslint/no-unused-vars': 'warn', // Changed from error to warn
      '@typescript-eslint/no-explicit-any': 'warn', // Changed from error to warn
      '@typescript-eslint/explicit-function-return-type': 'off', // Disabled for React components
      '@typescript-eslint/no-non-null-assertion': 'warn', // Changed from error to warn
      'prefer-const': 'error',
      'no-var': 'error',
      // Add essential Next.js rules manually
      '@next/next/no-html-link-for-pages': 'warn',
      // Silence missing plugin in CI and allow tailored per-file handling
      'react-hooks/exhaustive-deps': 'off',
      // Allow intentional empty blocks (e.g., replaced logs or dev-only code)
      'no-empty': 'off',
      '@next/next/no-img-element': 'warn',
    },
  },
];
