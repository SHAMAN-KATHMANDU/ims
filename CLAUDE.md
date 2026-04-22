# CLAUDE.md

Project rules live in `.claude/rules/` and are loaded automatically.

## Stack

- **API**: Node.js · Express · TypeScript · Prisma · PostgreSQL
- **Web**: Next.js App Router · React 19 · TypeScript 5 · Tailwind CSS v4 · shadcn/ui · TanStack Query v5 · Zustand v5 · React Hook Form v7 · Zod v3 · Axios

## Key Rules (see `.claude/rules/` for full detail)

- `api-architecture` — Controller → Service → Repository; arrow-function class fields only
- `api-response` — Always use `ok()` / `fail()` helpers; never raw `res.json()`
- `api-shared-utilities` — Use `getAuthContext()`, `AppError`, `sendControllerError` from `shared/`
- `api-governance` — Every endpoint needs Swagger docs; feature flags via `featureFlags.ts`
- `frontend-architecture` — Feature-based Clean Architecture under `features/<name>/`
- `frontend-api-contract` — After any API change, ripgrep all frontend callers; run `tsc --noEmit`
- `testing-architecture` — Unit (Vitest), integration (Supertest+DB), E2E (Playwright)
- `feature-lock-architecture` — Disabled features must make zero API calls
- `auth-enforcement` — All endpoints need explicit auth/authz decision
- `never-break-tests` — Fix root causes; never skip or delete failing tests
- `strict-typing` — No `any`, no `@ts-ignore`; explicit return types on exports
