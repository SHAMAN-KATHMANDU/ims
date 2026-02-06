# Release 1.0.0

## 1. Release Summary

| Field               | Value                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Application version | 1.0.0                                                                                                                  |
| Release name        | IMS Production Release 1.0.0                                                                                           |
| Release type        | PATCH (first production release; scope lock)                                                                           |
| Release date        | 2026-02-06                                                                                                             |
| Scope               | All API modules under `/api/v1/*`, all web routes under `apps/web/app`. No background workers, cron jobs, or webhooks. |

## 2. Production Readiness Verdict

**READY** – Pending completion of pre-deployment checklist in TESTING.md and verification that CORS_ORIGIN and all required environment variables are set in the target environment.

## 3. Blocking Issues and Assumptions

- **Assumptions:** Production deployment uses Docker Compose (or equivalent) with PostgreSQL 16; CORS_ORIGIN is set to the actual frontend origin(s); JWT_SECRET is strong and not shared; database backup is taken before deployment.
- **Blocking issues:** None identified in code. Deployment will fail at startup if required env vars are missing (fail-fast).
- **UNKNOWN:** Centralized log aggregation or monitoring tooling (not present in codebase).

## 4. Breaking Changes

None. This is the first production release (1.0.0).

## 5. Known Issues

None documented in code or existing docs. See TESTING.md for verification procedures.

## 6. Version and Compatibility Matrix

| Item                | Value                                                                  |
| ------------------- | ---------------------------------------------------------------------- |
| Application version | 1.0.0                                                                  |
| Node                | 20.18.0                                                                |
| pnpm                | 9.0.0                                                                  |
| API framework       | Express 5.x                                                            |
| Web framework       | Next.js 16.1.0                                                         |
| ORM                 | Prisma 5.22.x                                                          |
| Database            | PostgreSQL 16 (docker-compose.prod.yml); schema from Prisma migrations |
| API version         | Single version: `/api/v1` (no version negotiation)                     |

## 7. Deployment and Operations

### Supported environments

- **Dev:** NODE_ENV=development; CORS_ORIGIN defaults to \*; optional env vars.
- **Staging / Prod:** NODE_ENV=staging or production; required vars must be set; application exits on missing required config.

### Required environment variables

**API (staging/production):**

- NODE_ENV
- PORT (default 4000)
- HOST (default 0.0.0.0)
- JWT_SECRET (required in non-dev)
- DATABASE_URL (required in non-dev)
- CORS_ORIGIN (required in non-dev; must not be \* in production)
- API_PUBLIC_URL (required in non-dev; for API docs)

**Web (staging/production):**

- NEXT_PUBLIC_API_URL (required in non-dev)

**Docker/production (compose):**

- POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
- DOCKERHUB_USERNAME, TAG (for image names)
- SUPERADMIN_USERNAME, SUPERADMIN_PASSWORD (for seed/setup; not runtime API config)

### External services

- **PostgreSQL:** Required. Connection via DATABASE_URL.
- **Vercel Analytics (web):** Optional; client-side only. Application operates without it.

### Startup checks and failure modes

- **API:** Env validation (JWT_SECRET, DATABASE_URL, CORS_ORIGIN, API_PUBLIC_URL in non-dev); DB connect; `SELECT 1` health query. On failure: logger.error and process.exit(1).
- **Web:** Build-time throw if NEXT_PUBLIC_API_URL is missing in non-dev.

### Logging and monitoring

- Structured logger with request IDs; in production only errors and warnings (no debug). X-Request-ID response header set per request. No in-repo log aggregation; ops tooling: UNKNOWN.

## 8. Database and Migrations

### Migration versions (apply in this order)

1. 20260109180432_initial_migration
2. 20260118000000_add_locations_and_transfers
3. 20260118100000_add_sales_and_members
4. 20260121104419_add
5. 20260121141213_new
6. 20260130120151_add_location_default_warehouse
7. 20260131000000_add_sub_variations
8. 20260202084128_sales
9. 20260202094011_add_last_login_audit_error_reports
10. 20260202100000_add_is_credit_sale_to_sales

### Safety

- Migrations are additive except for DROP INDEX in add_sub_variations (replaced by new unique index). No DROP TABLE or TRUNCATE.
- Rollback: No down migrations in repo. Rollback = restore database from backup and redeploy previous application version.

### Backup

- Take a full database backup before deployment. No automated backup is provided in the codebase.

## 9. Security and Access

- **Authentication:** JWT (Bearer token). Issued on POST /auth/login. Validated by auth middleware using env.jwtSecret.
- **Roles:** superAdmin, admin, user (Prisma Role enum). Enforced per route via role middleware.
- **Admin-only operations:** Users CRUD (superAdmin); audit logs (superAdmin); error report list/update (superAdmin); location create/delete (superAdmin); dashboard superAdmin summary; product/vendor/category/member/sale/transfer write or admin-only endpoints (see FEATURE_LIST.md).
- **Security-sensitive config:** JWT_SECRET must be strong and must never be logged. CORS_ORIGIN must be set to specific origin(s) in production (not \*).

## 10. Rollback and Failure Plan

- **Code rollback:** Revert to previous Git commit; rebuild and redeploy images; set TAG to previous version in docker-compose.
- **Database rollback:** No down migrations. If reverting application code that assumes an older schema, restore database from backup taken before the deployment that applied newer migrations.
- **Feature flags:** None in use; no kill switches.
- **Data loss risks:** None from migrations (additive plus safe DROP INDEX). Data loss only from manual DB operations or restoring an older backup.
