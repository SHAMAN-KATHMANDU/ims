import { globalIgnores } from "eslint/config";
import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  globalIgnores([
    "playwright-report/**",
    "test-results/**",
    ".next/**",
    "node_modules/**",
  ]),
  ...nextJsConfig,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react/prop-types": "off",
    },
  },
  // Phase 4 architecture boundary enforcement.
  // Rule: features expose a public API only via their `index.ts` barrel.
  // Feature-internal code MUST use relative imports (`./` / `../`), not `@/features/<X>/...`,
  // so that this rule correctly rejects any cross-feature internal import.
  // See .claude/rules/frontend-architecture.md §Cross-Feature Rules.
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["**/*.test.ts", "**/*.test.tsx", "**/node_modules/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            // Block imports into a feature's internal layers from outside that feature.
            // Legal cross-feature import: `@/features/<name>` or `@/features/<name>/index`.
            {
              group: [
                "@/features/*/services",
                "@/features/*/services/*",
                "@/features/*/services/**",
                "@/features/*/hooks",
                "@/features/*/hooks/*",
                "@/features/*/hooks/**",
                "@/features/*/components",
                "@/features/*/components/*",
                "@/features/*/components/**",
                "@/features/*/validation",
                "@/features/*/validation/*",
                "@/features/*/types",
                "@/features/*/types/*",
                "@/features/*/store",
                "@/features/*/store/*",
                "@/features/*/store/**",
              ],
              message:
                "Import a feature only via its public barrel (`@/features/<name>`). " +
                "Feature-internal code must use relative imports (`./`, `../`). " +
                "See .claude/rules/frontend-architecture.md §Cross-Feature Rules.",
            },
            // Block retired top-level directories being removed in Phase 4.
            {
              group: [
                "@/views",
                "@/views/*",
                "@/views/**",
                "@/services",
                "@/services/*",
                "@/services/**",
              ],
              message:
                "Legacy top-level `views/` and `services/` are retired in Phase 4. " +
                "Move code into `features/<name>/` and import via `@/features/<name>`.",
            },
          ],
        },
      ],
    },
  },
];
