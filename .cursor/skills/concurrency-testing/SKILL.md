---
name: concurrency-testing
description: Inventory/sale/transfer race tests, parallel requests, oversell prevention. Use when testing concurrent behavior.
---

# Concurrency Testing

Use when testing inventory/sale/transfer races, parallel requests, and oversell prevention.

## When to Activate

- Testing sale creation under concurrent load
- Verifying transaction atomicity (sale + inventory in one $transaction)
- Transfer concurrency
- Delete/update race conditions

## Patterns

### Transaction Atomicity

- Assert `prisma.$transaction` is called for multi-step operations
- Use mocks to verify sale.create + inventory update happen in same callback

### Real Parallel Requests

- Use `Promise.all` with multiple sale/create requests
- Verify no oversell (total sold ≤ stock)
- Requires test DB for full validation

## Exemplars

- `apps/api/tests/concurrency/inventory-race.test.ts`
- `apps/api/src/modules/sales/sale.repository.test.ts`

## Cross-References

- `.cursor/skills/postgres-patterns/SKILL.md`
- `.cursor/skills/backend-patterns/SKILL.md`
