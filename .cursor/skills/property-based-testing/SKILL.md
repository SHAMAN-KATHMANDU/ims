---
name: property-based-testing
description: Fuzzing Zod schemas, invariant verification, edge case discovery. Use when writing property-based tests.
---

# Property-Based Testing

Use when fuzzing Zod schemas, verifying invariants, or discovering edge cases via generated inputs.

## When to Activate

- Fuzzing schema valid/invalid boundaries
- Verifying schema invariants (e.g. total = sum(lineTotals))
- Manual fuzz arrays for valid/invalid cases
- Optional: fast-check for automated generation

## Patterns

### Manual Fuzz

- Valid cases: boundary values, empty, max length
- Invalid cases: wrong type, empty required, over max length
- Use `schema.safeParse(input)` and assert `success` or `!success`

### Invariants

- For sale schema: discount ≤ total, lineTotals sum = subtotal
- For pagination: page \* limit consistency

## Exemplars

- `apps/api/tests/property/schema-fuzz.test.ts` (CreateCategorySchema, DeleteBodySchema)

## Cross-References

- `.cursor/skills/tdd-workflow/SKILL.md`
- `.cursor/skills/coding-standards/SKILL.md`
