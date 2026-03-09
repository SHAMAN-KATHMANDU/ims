---
name: test-infrastructure
description: Creating test factories, helpers, DB rollback utilities, and mock setup. Use when building test infrastructure.
---

# Test Infrastructure

Use this skill when creating or extending test factories, helpers, DB utilities, and mock patterns.

## When to Activate

- Creating test data factories
- Adding shared test helpers (makeReq, mockRes, apiRequest)
- Setting up DB transaction rollback for integration tests
- Creating centralized mock utilities (createMockPrisma, createMockService)

## Patterns

### Factories

- Use deterministic IDs for reproducibility (e.g. `cat-00000000-0000-4000-8000-000000000001`)
- Export `createX(overrides)` — merge with sensible defaults
- Export `XOverrides` interface for typed overrides
- Location: `apps/api/tests/factories/`

### Controller Helpers

- `makeReq(overrides)` — mock Request with user, params, body, query, get(), ip
- `mockRes()` — mock Response with status().json() chaining
- Location: `apps/api/tests/helpers/controller.ts`
- Never duplicate inline — always import from `@tests/helpers/controller`

### API Integration Helpers

- `apiRequest(app)` — Supertest agent for Express app
- Location: `apps/api/tests/helpers/api.ts`

### DB Helpers

- `withTestTransaction(prisma, fn)` — run test logic inside Prisma transaction
- For integration tests with real DB; unit tests mock Prisma
- Location: `apps/api/tests/helpers/db.ts`

### Mock Utilities

- `createMockDelegate()` — Prisma model delegate with findMany, findFirst, create, update, delete
- `createMockBasePrismaForTrash()` — basePrisma structure for trash cleanup job tests
- `createMockService(methods)` — generic service mock
- Location: `apps/api/tests/helpers/mocks.ts`

## Exemplars

- `apps/api/tests/factories/` — user, tenant, category, product, sale, inventory
- `apps/api/tests/helpers/controller.ts` — makeReq, mockRes
- `apps/api/tests/helpers/db.ts` — withTestTransaction

## Cross-References

- `.cursor/rules/testing-architecture.mdc`
- `.cursor/skills/tdd-workflow/SKILL.md`
