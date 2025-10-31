// Config mínima para evitar fallos de plugins en Vercel/CI
export default [
  { files: ['**/*.{js,mjs,cjs,ts,tsx}'] },
  {
    rules: {
      'no-console': 'warn',
    },
  },
];
