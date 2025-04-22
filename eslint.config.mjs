import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

import typescriptParser from "@typescript-eslint/parser"; // Import the parser
import typescriptPlugin from "@typescript-eslint/eslint-plugin"; // Import the plugin

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Add custom rules configuration
  {
    files: ["**/*.ts", "**/*.tsx"], // Apply only to TypeScript files
    languageOptions: {
      parser: typescriptParser, // Specify the TypeScript parser
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin, // Register the TypeScript plugin
    },
    rules: {
      // Allow unused variables/args if they start with an underscore
      "@typescript-eslint/no-unused-vars": [
        "warn", // or "error"
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Add any other custom rule overrides here
    },
  },
];

export default eslintConfig;
