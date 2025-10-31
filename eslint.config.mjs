import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

// Minimal ESLint config for Vercel builds - all rules set to 'off' or 'warn' only
// TypeScript errors are handled by tsc, not ESLint during build
export default [
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Disable all strict rules for build - development should use IDE linting
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // Disable complaint about unused eslint-disable comments
      'no-unused-disable-comments': 'off',
    },
    // Completely ignore reports about unused eslint-disable directives
    reportUnusedDisableDirectives: false,
  },
];
