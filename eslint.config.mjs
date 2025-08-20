import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierPlugin from "eslint-plugin-prettier";
import nextPlugin from "@next/eslint-plugin-next";
import prettierConfig from "eslint-config-prettier";

export default [
  { files: ["**/*.{js,mjs,cjs,ts,tsx}"] },
  { languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 2022, sourceType: "module" } } },
  { languageOptions: { globals: { browser: true, es6: true, node: true } } },
  js.configs.recommended,
  {
    plugins: { "@typescript-eslint": typescript },
    rules: {
      ...typescript.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "error"
    }
  },
  { rules: nextPlugin.configs["core-web-vitals"].rules },
  prettierConfig,
  { plugins: { prettier: prettierPlugin } },
  { rules: {
    "prettier/prettier": "error",
    "no-console": "warn",
    "prefer-const": "error",
    "no-var": "error"
  } }
];
