# How to Execute This Plan

**Read `.claude/PLAN.md` for the full step-by-step plan.**

## Quick Rules

1. **Always read the file before editing it.**
2. **After every code change, run:**
   ```bash
   cd apps/api && pnpm test:run          # if API files changed
   cd apps/web && pnpm test:run          # if Web files changed
   cd apps/api && npx tsc --noEmit       # API type check
   cd apps/web && npx tsc --noEmit       # Web type check
   ```
3. **Fix all test and type errors before committing.**
4. **Check the UI** — `pnpm dev` is already running.
5. **Commit after each step** with the commit message from the plan.
6. **Create a checkpoint file** in `.claude/` after each commit.

## Checkpoint Format

After each commit, create `.claude/CHECKPOINT-XX-NAME.md`:

```markdown
# Checkpoint XX — Step Name

**Commit:** <hash>
**Status:** DONE
**Tests:** PASS
**Type check:** PASS

## What was done
- bullet points

## What's next
- next step from PLAN.md
```

## Step Order

Follow PLAN.md steps in order: 1.1 → 1.2 → 1.3 → 1.4 → 2.1 → 2.2 → ... → 6.7

## Key File Locations

| What | Where |
|------|-------|
| Full plan | `.claude/PLAN.md` |
| Checkpoints | `.claude/CHECKPOINT-XX-*.md` |
| API tests | `cd apps/api && pnpm test:run` |
| Web tests | `cd apps/web && pnpm test:run` |
| API types | `cd apps/api && npx tsc --noEmit` |
| Web types | `cd apps/web && npx tsc --noEmit` |
| Prisma migrate | `cd apps/api && npx prisma migrate dev --name <name>` |
| Dev server | Already running via `pnpm dev` |

## If You Get Stuck

1. Read the relevant skill file from `.cursor/skills/` (see `.cursor/rules/skills-index.mdc`)
2. Read the architecture rules from `.cursor/rules/`
3. Check existing similar code in the codebase for patterns
4. If a test fails, read the test file to understand what it expects
