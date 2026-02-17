/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "perf", "chore", "docs", "refactor", "test", "ci"],
    ],
    "scope-case": [2, "always", "kebab-case"],
    "subject-max-length": [2, "always", 100],
    "header-max-length": [2, "always", 100],
  },
};
