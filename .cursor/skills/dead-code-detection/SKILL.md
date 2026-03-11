---
name: dead-code-detection
description: Patterns for finding unused exports, orphaned files, and unreachable code.
origin: projectX-audit
---

# Dead Code Detection

Identify and safely remove code that is no longer used.

## When to Activate

- Before major refactors
- When reducing bundle size
- During codebase hygiene sprints
- When a feature is deprecated

## Detection Methods

### Unused Exports

- Use `ts-prune` or `knip` to find exported symbols with no imports
- ESLint `no-unused-vars` for local variables
- TypeScript `noUnusedLocals` and `noUnusedParameters`

### Orphaned Files

- Files not imported anywhere (grep for file path, check index re-exports)
- Empty directories or placeholder files

### Unreachable Code

- Code after `return` or `throw`
- Branches that can never execute (e.g. `if (false)`)

## Tools

- `ts-prune` — Find unused exports
- `knip` — Comprehensive dead code detection
- `madge` — Dependency graph, find orphan modules

## Safe Removal Checklist

1. Confirm no dynamic imports reference the code
2. Remove the code
3. Run full test suite
4. Run type check and lint
