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

### Port-collision safe run

Playwright starts its own web server. To avoid collisions with an already running local app on `3000`, run E2E on a dedicated port:

```bash
PLAYWRIGHT_PORT=3100 pnpm --filter web exec playwright test e2e/crm/contact-flow.spec.ts
```

If you manage your own web server manually, set `BASE_URL` to match it:

```bash
BASE_URL=http://localhost:3200 pnpm --filter web exec playwright test e2e/crm
```

## Environment

| Variable                       | Default                        | Description                                                                                                                                           |
| ------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E2E_TENANT_SLUG`              | `test1`                        | Tenant slug for E2E flows                                                                                                                             |
| `E2E_USERNAME`                 | `admin`                        | Username (from seed)                                                                                                                                  |
| `E2E_PASSWORD`                 | `test123`                      | Password (from seed)                                                                                                                                  |
| `PLAYWRIGHT_PORT`              | `3100`                         | Port used by Playwright web server startup                                                                                                            |
| `BASE_URL`                     | derived from `PLAYWRIGHT_PORT` | Explicit base URL for manual server runs                                                                                                              |
| `E2E_AUTOMATION_BRANCHING_OFF` | unset                          | Set to `1` so Playwright-started Next.js omits `AUTOMATION_BRANCHING` from `NEXT_PUBLIC_FEATURE_FLAGS` (AT-UI-001). Stop any reused dev server first. |

### Automation branching E2E (AT-UI-001–003)

Requires **API on port 4000** (see “Full E2E” above) so Next can proxy `/api/v1`.

```bash
# AT-UI-002 + AT-UI-003 (default dev feature matrix)
pnpm --filter web run test:e2e:automation:branching-on

# Full file (includes skipped AT-UI-001 unless branching-off server)
pnpm --filter web run test:e2e:automation

# AT-UI-001 only — must use a server started with branching off (see playwright.config)
E2E_AUTOMATION_BRANCHING_OFF=1 pnpm --filter web exec playwright test e2e/automation/event-automations.spec.ts --grep AT-UI-001
```

CI runs these in **`.github/workflows/ci.yml`** job **e2e-web-automation** (Postgres + Redis + migrate + seed + API + both Playwright passes).

**AT-UI-003** mocks `GET /api/v1/automation/definitions` and `GET .../definitions/:id/runs` so Recent runs can be asserted without pre-seeded graph runs.

## Test Structure

- `auth/` — Auth flow (login, invalid credentials)
- `auth.spec.ts` — Smoke tests (page loads)
- `sales/` — Sale creation flow
- `products/` — Product CRUD flow
- `transfers/` — Transfer flow (create, complete)
- `members/` — Member CRUD and bulk upload
- `crm/` — CRM contact management
- `automation/` — Event automations (branching flags, run-detail UX)
- `settings/` — Settings page, audit logs, error reports (superAdmin redirect)
