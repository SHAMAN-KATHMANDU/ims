---
name: iterative-retrieval
description: 4-phase context retrieval loop for AI subagents — Dispatch, Evaluate, Refine, Loop (max 3 cycles) — to gather sufficient context before implementing.
origin: ECC
---

# Iterative Retrieval

A structured 4-phase context retrieval loop for gathering sufficient information before implementing solutions.

## When to Activate

- Starting work on an unfamiliar codebase
- Implementing a feature that touches multiple files
- Debugging an issue where the root cause is unclear
- Refactoring code that has complex dependencies
- Any task where you need to understand context before acting

## The 4-Phase Loop

```
Phase 1: DISPATCH  → Search broadly for relevant context
Phase 2: EVALUATE  → Assess if you have enough to proceed
Phase 3: REFINE    → Narrow search based on gaps found
Phase 4: LOOP      → Repeat up to 3 cycles total, then proceed
```

### Phase 1: Dispatch

Start with broad searches to understand the landscape:

```
Search targets:
- File structure (glob patterns)
- Key symbols (grep for class/function names)
- Related modules (grep for import paths)
- Existing patterns (grep for similar implementations)
- Tests (understand expected behavior)
```

Example dispatch queries:

```bash
# Find all files related to the feature
glob: apps/api/src/modules/categories/**

# Find how similar features are implemented
grep: "class.*Repository" --type ts
grep: "service.create" --type ts

# Find existing tests
glob: **/*.test.ts --include categories
```

### Phase 2: Evaluate

After initial search, assess completeness:

```
Ask yourself:
✓ Do I understand the current implementation pattern?
✓ Do I know what files need to change?
✓ Do I know the data model (Prisma schema)?
✓ Do I understand the auth/tenant context?
✓ Do I know the error handling pattern?
✓ Are there tests I need to update?

If all YES → proceed to implementation
If any NO → go to Phase 3
```

### Phase 3: Refine

Target specific gaps identified in Phase 2:

```
Gap: Don't understand the data model
→ Read: prisma/schema.prisma (relevant models)

Gap: Don't know the auth pattern
→ Read: apps/api/src/shared/auth/getAuthContext.ts
→ Read: apps/api/src/middleware/requireAuth.ts

Gap: Don't know the response format
→ Read: apps/api/src/shared/response/index.ts

Gap: Don't know how similar module is structured
→ Read: apps/api/src/modules/products/ (all files)
```

### Phase 4: Loop

Repeat Phase 1-3 up to **3 cycles maximum**, then proceed:

```
Cycle 1: Broad discovery
Cycle 2: Fill specific gaps
Cycle 3: Final clarifications
→ Proceed with best available context
```

**Important**: Don't over-research. After 3 cycles, you have enough context. Proceed and adjust if needed.

## Retrieval Strategies

### Strategy 1: Pattern Matching

Find how existing code solves similar problems:

```bash
# Find all controller implementations
grep: "async.*Request.*Response" --type ts --include "*.controller.ts"

# Find all service create methods
grep: "async create\(" --type ts --include "*.service.ts"

# Find all Zod schema definitions
grep: "z\.object\(" --type ts --include "*.schema.ts"
```

### Strategy 2: Dependency Tracing

Understand what a file imports and what imports it:

```bash
# What does this file import?
grep: "from.*@/shared" --file apps/api/src/modules/categories/category.controller.ts

# What imports this file?
grep: "from.*category.service" --type ts
```

### Strategy 3: Test-First Understanding

Read tests to understand expected behavior:

```bash
# Find tests for the feature
glob: **/*.test.ts
grep: "describe.*Category" --type ts

# Read the test to understand expected inputs/outputs
read: apps/api/src/modules/categories/category.service.test.ts
```

### Strategy 4: Schema-First

For database-related features, start with the schema:

```bash
# Read Prisma schema for relevant models
read: prisma/schema.prisma (search for relevant model)

# Find all queries for that model
grep: "prisma\.category\." --type ts
```

## Context Sufficiency Checklist

Before starting implementation, verify:

**For a new API endpoint:**

- [ ] Prisma model structure understood
- [ ] Auth/tenant context pattern understood
- [ ] Request validation pattern (Zod schema) understood
- [ ] Response format (`ok()`/`fail()`) understood
- [ ] Error handling pattern understood
- [ ] Similar endpoint exists as reference
- [ ] Router file location known
- [ ] Test file location known

**For a bug fix:**

- [ ] Reproduction steps understood
- [ ] Affected code located
- [ ] Root cause identified (not just symptom)
- [ ] Related tests found
- [ ] Fix approach validated against existing patterns

**For a refactor:**

- [ ] All files that need changing identified
- [ ] Callers of the code being changed found
- [ ] Tests that will be affected identified
- [ ] Migration path planned (if breaking change)

## Anti-Patterns to Avoid

### Over-Retrieval

```
❌ Reading every file in the codebase
❌ Spending more than 10 minutes on research for a simple task
❌ Doing a 4th cycle when 3 are sufficient
```

### Under-Retrieval

```
❌ Starting implementation without reading any existing code
❌ Guessing at patterns instead of reading examples
❌ Ignoring tests when understanding expected behavior
```

### Wrong Retrieval Order

```
❌ Reading implementation before reading tests
❌ Reading a specific file before understanding the module structure
❌ Reading docs instead of code (code is ground truth)
```

## Example: Adding a New Module

**Task**: Add a `suppliers` module with CRUD operations.

**Cycle 1 — Broad Discovery:**

```
1. glob: apps/api/src/modules/ → see existing modules
2. read: apps/api/src/modules/categories/ → understand module structure
3. read: prisma/schema.prisma → find Supplier model
4. glob: apps/api/src/modules/categories/*.ts → read all 5 files
```

**Evaluate:**

- ✓ Module structure understood (5 files)
- ✓ Prisma model found
- ✗ Don't know how router is registered
- ✗ Don't know the dependency injection pattern

**Cycle 2 — Fill Gaps:**

```
5. read: apps/api/src/app.ts → find router registration
6. grep: "new CategoryController" → find DI pattern
7. read: apps/api/src/modules/categories/category.router.ts
```

**Evaluate:**

- ✓ All gaps filled
- ✓ Ready to implement

**Proceed to implementation** (no Cycle 3 needed).

## Time Budget

| Task Complexity     | Max Research Time | Max Cycles |
| ------------------- | ----------------- | ---------- |
| Simple (1 file)     | 2 minutes         | 1          |
| Medium (2-5 files)  | 5 minutes         | 2          |
| Complex (5+ files)  | 10 minutes        | 3          |
| Architecture change | 15 minutes        | 3          |

After the time budget, proceed with best available context. You can always course-correct during implementation.
