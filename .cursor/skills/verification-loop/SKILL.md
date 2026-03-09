---
name: verification-loop
description: 6-phase verification workflow after implementation — Build, TypeCheck, Lint, Tests, Security scan, Diff review — with structured report format.
origin: ECC
---

# Verification Loop

A structured 6-phase verification process to run after every significant implementation.

## When to Activate

- After completing a feature implementation
- Before creating a pull request
- After refactoring code
- After fixing a bug
- Before merging any significant change

## The 6 Phases

```
Phase 1: BUILD        → Code compiles without errors
Phase 2: TYPECHECK    → TypeScript types are valid
Phase 3: LINT         → Code style and quality rules pass
Phase 4: TESTS        → All tests pass, coverage maintained
Phase 5: SECURITY     → No new security issues introduced
Phase 6: DIFF REVIEW  → Changes are clean and intentional
```

## Phase 1: Build

```bash
# Verify the code compiles
pnpm --filter api build

# Or for the full monorepo
pnpm build

# Expected: exit code 0, no errors
# If fails: fix compilation errors before proceeding
```

**Common build failures:**

- Missing imports
- Syntax errors
- Missing required files
- Environment variable issues

## Phase 2: TypeCheck

```bash
# Run TypeScript type checking without emitting files
pnpm --filter api typecheck
# or
npx tsc --noEmit

# For the full monorepo
pnpm typecheck

# Expected: no type errors
# If fails: fix type errors (avoid using 'any' as a shortcut)
```

**Common type errors:**

- Missing type annotations
- Incorrect return types
- Null/undefined not handled
- Missing interface properties

## Phase 3: Lint

```bash
# Run ESLint
pnpm --filter api lint
# or
npx eslint apps/api/src --ext .ts

# Auto-fix fixable issues
pnpm --filter api lint:fix

# Expected: no errors (warnings acceptable but review them)
# If fails: fix lint errors, don't just disable rules
```

**Common lint issues:**

- Unused variables/imports
- Missing await on async calls
- `any` type usage
- Inconsistent code style

## Phase 4: Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter api test

# Run with coverage
pnpm --filter api test:coverage

# Run specific test file
npx jest apps/api/src/modules/categories/category.service.test.ts

# Expected:
# - All tests pass (0 failures)
# - Coverage >= 80% for changed files
# - No skipped tests (unless explicitly justified)
```

**If tests fail:**

1. Read the failure message carefully
2. Check if it's a test issue or implementation issue
3. Fix the root cause, not just the test
4. Never skip tests to make CI pass

## Phase 5: Security Scan

```bash
# Audit dependencies for vulnerabilities
pnpm audit

# Check for high/critical vulnerabilities
pnpm audit --audit-level high

# Run security linting (if configured)
npx eslint --plugin security apps/api/src

# Check for secrets accidentally committed
npx detect-secrets scan

# Expected: no high/critical vulnerabilities
# If found: update vulnerable packages or apply patches
```

**Security checklist for changed code:**

- [ ] No hardcoded secrets or API keys
- [ ] User input is validated with Zod
- [ ] Auth context used (not `req.user!` directly)
- [ ] SQL queries use parameterized inputs (Prisma handles this)
- [ ] No sensitive data logged
- [ ] Rate limiting on new endpoints

## Phase 6: Diff Review

```bash
# Review all changes
git diff HEAD

# Review staged changes
git diff --staged

# Review changes since branching from main
git diff main...HEAD

# Check files changed
git diff --name-only main...HEAD
```

**Diff review checklist:**

- [ ] No unintended file changes
- [ ] No debug code (`console.log`, `debugger`)
- [ ] No commented-out code
- [ ] No TODO comments left unresolved
- [ ] No `.env` or secret files accidentally included
- [ ] Migration files are correct
- [ ] Changes are focused (no scope creep)
- [ ] Commit messages are descriptive

## Verification Report Format

After completing all phases, produce a report:

```
## Verification Report

**Date**: 2025-01-15
**Branch**: feature/add-suppliers-module
**Changed files**: 8

### Phase 1: Build ✅
- `pnpm --filter api build` — PASSED

### Phase 2: TypeCheck ✅
- `pnpm typecheck` — PASSED (0 errors)

### Phase 3: Lint ✅
- `pnpm lint` — PASSED (0 errors, 2 warnings reviewed)
- Warnings: unused import in supplier.controller.ts (removed)

### Phase 4: Tests ✅
- `pnpm test` — PASSED (47 tests, 0 failures)
- Coverage: 84% (above 80% threshold)
- New tests added: 12

### Phase 5: Security ✅
- `pnpm audit` — PASSED (0 high/critical vulnerabilities)
- Manual review: auth context used correctly, input validated

### Phase 6: Diff Review ✅
- 8 files changed, 312 insertions, 45 deletions
- No debug code, no secrets, no unintended changes
- Migration file verified correct

### Summary
All 6 phases passed. Ready for PR.
```

## Handling Failures

### Build Failure

```bash
# Read the full error output
pnpm build 2>&1 | head -50

# Common fixes:
# - Missing import: add the import
# - Type error: fix the type annotation
# - Missing file: create the file or fix the import path
```

### Test Failure

```bash
# Run only the failing test
npx jest --testPathPattern="category.service" --verbose

# Run with more output
npx jest --verbose 2>&1 | grep -A 20 "FAIL"

# Common fixes:
# - Mock not set up: add mock for new dependency
# - Assertion wrong: fix the assertion or the implementation
# - Test setup issue: fix beforeEach/afterEach
```

### Coverage Drop

```bash
# See which lines are uncovered
npx jest --coverage --coverageReporters=text

# Add tests for uncovered lines
# Focus on: error paths, edge cases, new code
```

## Quick Verification (Pre-commit)

For small changes, run the quick version:

```bash
# Quick check (< 2 minutes)
pnpm typecheck && pnpm lint && pnpm test --passWithNoTests

# If all pass, proceed with commit
# If any fail, fix before committing
```

## CI/CD Integration

The verification loop should match your CI pipeline:

```yaml
# .github/workflows/ci.yml
jobs:
  verify:
    steps:
      - run: pnpm install --frozen-lockfile
      - run: pnpm build # Phase 1
      - run: pnpm typecheck # Phase 2
      - run: pnpm lint # Phase 3
      - run: pnpm test:ci # Phase 4
      - run: pnpm audit --audit-level high # Phase 5
      # Phase 6 (diff review) is manual in PR review
```

**Rule**: If it passes locally, it should pass in CI. If CI fails but local passes, investigate the difference (environment variables, Node version, etc.).
