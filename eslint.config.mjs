import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Disable React Compiler memoization preservation rule - too strict
      "react-hooks/preserve-manual-memoization": "off",
      // Disable strict any checking - common in existing codebase
      "@typescript-eslint/no-explicit-any": "off",
      // Disable set-state-in-effect - too strict for common patterns
      "react-hooks/set-state-in-effect": "off",
      // Disable immutability checking - too strict and has false positives with document.cookie/window.location
      "react-hooks/immutability": "off",
      // Allow unused vars and args if prefixed with underscore (standard TypeScript convention)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Supabase Edge Functions run on Deno - exclude from Next.js ESLint
    "supabase/functions/**",
    "scratch/**",
    "scripts/**",
  ]),
]);

export default eslintConfig;
