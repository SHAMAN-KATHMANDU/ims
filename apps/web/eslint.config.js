import { globalIgnores } from "eslint/config";
import { nextJsConfig } from "@repo/eslint-config/next-js";
import jsxA11y from "eslint-plugin-jsx-a11y";

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
  // Phase 8-E: jsx-a11y accessibility rules.
  {
    files: ["**/*.tsx"],
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    rules: {
      "jsx-a11y/no-static-element-interactions": "error",
      "jsx-a11y/click-events-have-key-events": "error",
      // controlComponents intentionally omits shadcn wrappers (Input, Select, Textarea,
      // Button, Switch, etc.) — they handle a11y internally and the rule cannot analyse
      // them statically, producing ~250 false positives.  Only native HTML interactive
      // elements (the rule's default) are checked here.
      "jsx-a11y/control-has-associated-label": [
        "error",
        {
          labelAttributes: ["label"],
          controlComponents: [],
          ignoreElements: [
            "audio",
            "canvas",
            "embed",
            "input",
            "textarea",
            "tr",
            "td",
            "th",
            "video",
            "option",
          ],
          ignoreRoles: [
            "grid",
            "listbox",
            "group",
            "rowgroup",
            "cell",
            "columnheader",
            "rowheader",
            "tooltip",
            "dialog",
            "alertdialog",
          ],
        },
      ],
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
