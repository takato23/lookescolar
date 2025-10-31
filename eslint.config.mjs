import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

// Minimal ESLint config for Vercel builds - all rules set to 'off'
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
    // Flat config format for linter options
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    rules: {
      // Disable all strict rules for build - development should use IDE linting
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
