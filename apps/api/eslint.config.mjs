import { config as baseConfig } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: ["dist/**", "**/prisma/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-constant-binary-expression": "off",
      "no-undef": "off",
      "prefer-const": "off",
      "turbo/no-undeclared-env-vars": "off",
    },
  },
  // Shared code: re-enable prefer-const incrementally.
  {
    files: ["src/shared/**/*.ts"],
    rules: {
      "prefer-const": "warn",
    },
  },
  // Controllers: no Prisma (use service/repository); prefer ≤300 lines.
  {
    files: ["src/modules/**/*.controller.ts", "src/modules/**/*.controller.tsx"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "@/config/prisma",
              message: "Controllers must not import prisma; use service/repository layer.",
            },
          ],
        },
      ],
      "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
];
