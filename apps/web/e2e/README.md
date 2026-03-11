# E2E Tests

Playwright end-to-end tests for the web app.

## Running Tests

### Smoke tests (no API required)

```bash
pnpm --filter web exec playwright test auth.spec.ts
```

### Full E2E tests (API + DB required)

Login, sale creation, and product CRUD tests require the full stack:

1. **Start Postgres** (if using Docker):

   ```bash
   docker compose -f docker-compose.dev.yml up -d postgres
   ```

2. **Run migrations and seed**:

   ```bash
   pnpm prisma:migrate
   pnpm prisma:seed
   ```

3. **Start the dev stack** (API + web):

   ```bash
   pnpm dev
   ```

4. **Run E2E tests** (in another terminal):
   ```bash
   pnpm --filter web test:e2e
   ```

## Environment

| Variable          | Default   | Description               |
| ----------------- | --------- | ------------------------- |
| `E2E_TENANT_SLUG` | `test1`   | Tenant slug for E2E flows |
| `E2E_USERNAME`    | `admin`   | Username (from seed)      |
| `E2E_PASSWORD`    | `test123` | Password (from seed)      |

## Test Structure

- `auth/` — Auth flow (login, invalid credentials)
- `auth.spec.ts` — Smoke tests (page loads)
- `sales/` — Sale creation flow
- `products/` — Product CRUD flow
- `transfers/` — Transfer flow (create, complete)
- `members/` — Member CRUD and bulk upload
- `crm/` — CRM contact management
- `settings/` — Settings page, audit logs, error reports (superAdmin redirect)
