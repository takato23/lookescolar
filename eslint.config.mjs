import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierPlugin from "eslint-plugin-prettier";
import nextPlugin from "@next/eslint-plugin-next";
import prettierConfig from "eslint-config-prettier";

export default [
  { files: ["**/*.{js,mjs,cjs,ts,tsx}"] },
  { languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 2022, sourceType: "module" } } },
  { languageOptions: { globals: { browser: true, es6: true, node: true } } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: nextPlugin.configs["core-web-vitals"].rules },
  prettierConfig,
  { plugins: { "@typescript-eslint": tseslint, prettier: prettierPlugin } },
  { rules: {
    "prettier/prettier": "error",
    "no-console": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-non-null-assertion": "error",
    "prefer-const": "error",
    "no-var": "error"
  } }
];
