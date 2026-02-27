---
name: continuous-learning
description: Stop-hook pattern to extract reusable patterns from development sessions and save them as skills in ~/.cursor/skills/learned/ for future reuse.
origin: ECC
---

# Continuous Learning

A pattern for extracting reusable insights from development sessions and persisting them as skills.

## When to Activate

- At the end of a significant development session
- After solving a tricky problem with a non-obvious solution
- After discovering a pattern that should be reused
- After making a mistake and learning from it
- When you notice a pattern appearing multiple times

## Core Concept

Development sessions contain valuable insights that are lost when the context ends. This skill provides a structured way to capture and persist those insights.

```
Session ends
    ↓
Extract reusable patterns
    ↓
Write to ~/.cursor/skills/learned/<pattern-name>/SKILL.md
    ↓
Available in future sessions
```

## What to Capture

### Good candidates for learned skills

```
✅ Non-obvious solutions to common problems
✅ Project-specific patterns discovered through trial and error
✅ Workarounds for library quirks or bugs
✅ Performance optimizations that weren't obvious
✅ Security patterns specific to this codebase
✅ Integration patterns between project components
✅ Debugging techniques that worked
```

### Poor candidates (don't capture these)

```
❌ Obvious patterns already in documentation
❌ One-off solutions that won't recur
❌ Patterns already covered by existing skills
❌ Temporary workarounds (capture as TODO instead)
```

## Skill Extraction Process

### Step 1: Identify the Pattern

At the end of a session, ask:
- What non-obvious thing did I learn?
- What would have saved me time if I'd known it earlier?
- What pattern did I use multiple times?
- What mistake did I make that others should avoid?

### Step 2: Generalize It

Take the specific solution and generalize it:

```
Specific: "Fixed N+1 in category.controller.ts by adding include"
General: "When loading related entities in Prisma, always use include
          at the repository layer to prevent N+1 queries"
```

### Step 3: Write the Skill

```markdown
---
name: <kebab-case-name>
description: <one-line description of what this captures>
origin: learned
session: <date>
---

# <Title>

## Context

<What problem does this solve? When does it occur?>

## Pattern

<The reusable pattern, with code examples>

## When to Apply

<Specific triggers that should activate this pattern>

## Anti-Pattern

<What NOT to do, and why>

## Example

<Concrete before/after example from the session>
```

### Step 4: Save the Skill

```bash
# Create skill directory
mkdir -p ~/.cursor/skills/learned/<skill-name>

# Write skill file
# (Use your editor or the Write tool)
```

## Example: Learned Skill

```markdown
---
name: prisma-tenant-scope
description: Always scope Prisma queries to tenantId — discovered that missing tenant scope causes cross-tenant data leakage in multi-tenant queries.
origin: learned
session: 2025-01-15
---

# Prisma Tenant Scope

## Context

In this multi-tenant SaaS application, every Prisma query on tenant-scoped
models MUST include a `tenantId` filter. Missing this filter causes data
from other tenants to be returned, which is a critical security bug.

## Pattern

```typescript
// ✅ ALWAYS include tenantId in where clause
const categories = await prisma.category.findMany({
  where: {
    tenantId,  // REQUIRED
    ...otherFilters,
  },
});

// ❌ NEVER query without tenant scope
const categories = await prisma.category.findMany({
  where: { name: "Electronics" }, // Missing tenantId!
});
```

## When to Apply

Every time you write a Prisma query for a model that has a `tenantId` field.

## Anti-Pattern

Forgetting `tenantId` in queries that filter by other fields (name, status, etc.)
— the filter works but returns results from ALL tenants.

## Example

Bug found: `category.repository.ts` had `findByName(name: string)` without
`tenantId`, causing categories from other tenants to be returned when names
matched across tenants.

Fix: Changed to `findByName(tenantId: string, name: string)` and added
`tenantId` to the where clause.
```

## Session Review Checklist

At the end of each significant session:

```
□ What non-obvious patterns did I use?
□ What mistakes did I make that others should avoid?
□ What would have saved me 30+ minutes if I'd known it?
□ Are there any project-specific quirks I discovered?
□ Did I solve a problem in a reusable way?

For each "yes" answer → write a learned skill
```

## Skill Naming Conventions

```
# Format: <domain>-<pattern>
prisma-tenant-scope
express-error-propagation
zod-prisma-type-sync
auth-context-middleware-order
redis-cache-invalidation-pattern

# Use kebab-case, be specific
# Good: prisma-soft-delete-filter
# Bad: database-stuff
# Bad: my-pattern
```

## Learned Skills Directory

```
~/.cursor/skills/learned/
  prisma-tenant-scope/
    SKILL.md
  express-error-propagation/
    SKILL.md
  zod-prisma-type-sync/
    SKILL.md
```

These are personal/project-specific skills that supplement the general skills from ECC.
