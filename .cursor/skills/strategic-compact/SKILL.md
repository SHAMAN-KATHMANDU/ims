---
name: strategic-compact
description: Guidelines for when to compact AI context — after research phases, after milestones, never mid-implementation — to maintain focus and reduce context noise.
origin: ECC
---

# Strategic Compact

Guidelines for strategically compacting AI context to maintain focus and efficiency.

## When to Activate

- Context window is getting large (> 50k tokens)
- Switching from research phase to implementation phase
- After completing a major milestone
- Before starting a new, unrelated task
- When the conversation has accumulated significant noise

## Core Principle

**Compact at phase boundaries, never mid-implementation.**

Compacting at the wrong time loses critical context. Compacting at the right time removes noise and sharpens focus.

## When to Compact ✅

### After Research Phase

```
Scenario: You've spent 20 messages exploring the codebase,
reading files, and understanding patterns.

✅ GOOD TIME TO COMPACT:
- You have a clear implementation plan
- You've identified all files to change
- You understand the patterns to follow
- You're about to start writing code

Why: The research context is now encoded in your plan.
The raw file contents and exploration messages are noise.
```

### After Completing a Milestone

```
Scenario: You've finished implementing feature A and are
about to start feature B.

✅ GOOD TIME TO COMPACT:
- Feature A is complete and tested
- You have a summary of what was done
- Feature B is a distinct, separate task
- The context from feature A won't help with feature B

Why: Feature A context is now irrelevant noise for feature B.
```

### Before a New Unrelated Task

```
Scenario: You've been debugging an auth issue and now
need to add a new API endpoint.

✅ GOOD TIME TO COMPACT:
- The debugging session is complete
- The fix is implemented and verified
- The new task is unrelated to auth
- The debugging context won't help with the new endpoint

Why: Debugging context is noise for the new task.
```

## When NOT to Compact ❌

### Mid-Implementation

```
❌ BAD TIME TO COMPACT:
- You're in the middle of writing a complex function
- You have uncommitted changes
- You're debugging an active issue
- You're in the middle of a multi-step refactor
- You haven't finished the current task

Why: You'll lose the implementation context you need
to complete the current work correctly.
```

### When Context is Still Needed

```
❌ BAD TIME TO COMPACT:
- You're about to make related changes to the same files
- The current context has error messages you need to reference
- You have a complex chain of reasoning in progress
- You're mid-way through a TDD cycle (tests written, not passing yet)

Why: Compacting removes context you actively need.
```

### When You Haven't Summarized

```
❌ BAD TIME TO COMPACT:
- You haven't written down the key decisions made
- The implementation plan isn't documented
- You haven't noted which files were changed and why

Why: You'll lose important context with no way to recover it.
```

## Pre-Compact Checklist

Before compacting, ensure:

- [ ] Current task is complete (or at a clean stopping point)
- [ ] All changes are committed (or clearly documented)
- [ ] Key decisions are written down
- [ ] Implementation plan for next phase is clear
- [ ] Any important file paths/patterns are noted

## What to Preserve Before Compacting

Write a brief summary capturing:

```markdown
## Context Summary (pre-compact)

### What was accomplished

- Implemented suppliers module (5 files)
- Added Zod validation schema
- Created repository, service, controller
- Added 12 unit tests (all passing)

### Key decisions made

- Used cursor pagination (not offset) for supplier list
- Soft delete pattern (deletedAt field)
- Auth via getAuthContext(req) — consistent with other modules

### Files changed

- apps/api/src/modules/suppliers/ (new directory, 5 files)
- apps/api/src/app.ts (registered supplier router)
- prisma/schema.prisma (added Supplier model)
- prisma/migrations/... (new migration)

### Next steps

- Add E2E tests for supplier CRUD
- Add supplier filtering by status
- Connect suppliers to purchase orders
```

## Compact Trigger Signals

Watch for these signals that it's time to compact:

```
🔴 Context is > 80% full — compact soon
🟡 Context is > 60% full — plan your compact point
🟢 Context is < 40% full — no action needed

Other signals:
- Responses are getting slower
- AI seems to "forget" earlier context
- You're repeating context that was already established
- The conversation has > 30 messages
```

## After Compacting

When resuming after a compact:

1. **Re-establish context** — share the pre-compact summary
2. **Confirm understanding** — verify the AI has the key context
3. **Start fresh** — don't reference old conversation turns
4. **Re-read key files** — if implementation requires specific file knowledge

```
"We're continuing work on the suppliers module. Here's the context:
[paste pre-compact summary]

Next task: Add E2E tests for supplier CRUD operations."
```

## Anti-Patterns

```
❌ Compacting when you're stuck (instead: ask for help)
❌ Compacting to avoid a hard problem (instead: tackle it)
❌ Compacting without a summary (you'll lose context)
❌ Never compacting (context bloat degrades quality)
❌ Compacting after every message (too disruptive)
```
