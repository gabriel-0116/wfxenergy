import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  // Ignorar arquivos/pastas que só geram ruído
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "tailwind.config.js",
    "postcss.config.js",
  ]),

  // Regras customizadas do seu projeto
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);
