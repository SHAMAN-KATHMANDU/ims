---
name: integration-testing
description: API integration tests with Supertest, DB-backed tests, transaction rollback. Use when writing integration tests.
---

# Integration Testing

Use when writing API integration tests that hit the real Express app and optionally a test database.

## When to Activate

- Writing tests that hit `/api/v1/*` endpoints
- Testing auth flow end-to-end
- Testing with real DB (test DB with rollback)
- Using Supertest against the Express app

## Patterns

### Supertest + Express

```typescript
import app from "@/config/express.config";
import { apiRequest } from "@tests/helpers/api";

const res = await apiRequest(app).get("/api/v1/users");
expect(res.status).toBe(401);
```

### JWT Fixtures

- Create valid token for authenticated requests
- Use factories for user/tenant when seeding

### Test DB

- Use `DATABASE_URL_TEST` or `DATABASE_URL` for integration
- Wrap in `withTestTransaction` for rollback isolation when available
- See `apps/api/tests/helpers/db.ts`

## Exemplars

- `apps/api/tests/integration/api/auth.integration.test.ts`
- `apps/api/tests/helpers/api.ts`

## Cross-References

- `.cursor/rules/testing-architecture.mdc`
- `.cursor/skills/backend-patterns/SKILL.md`
