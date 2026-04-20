# CLAUDE.md

Project instructions for Claude Code. Imported from `.cursor/rules/` on 2026-04-19.

---

## Rule: api-architecture

_Enforces the 3-layer Controller → Service → Repository architecture for all API modules_

## API Module Architecture

Every module under `apps/api/src/modules/<name>/` must have exactly these 6 files:

```
<name>.repository.ts        ← ONLY file that imports prisma
<name>.service.ts           ← business logic only, no req/res
<name>.controller.ts        ← thin HTTP layer: calls service, uses ok()/fail()
<name>.schema.ts            ← Zod validation schemas
<name>.schema.test.ts       ← unit tests for schemas
<name>.controller.test.ts   ← unit tests for the controller
```

## Layer Rules

### Repository (`*.repository.ts`)

- The **only** layer that imports `prisma`
- No business logic — pure data access
- Returns domain objects, throws on not-found

```typescript
// ✅ GOOD
import prisma from "@/config/prisma";
export class CategoryRepository {
  async findByTenant(tenantId: string) {
    return prisma.category.findMany({ where: { tenantId } });
  }
}

// ❌ BAD — prisma in controller
import prisma from "@/config/prisma"; // never in controller or service
```

### Service (`*.service.ts`)

- Business logic only
- No `req`, `res`, or HTTP concepts
- Calls repository methods, applies business rules

```typescript
// ✅ GOOD
export class CategoryService {
  constructor(private repo: CategoryRepository) {}
  async create(tenantId: string, data: CreateCategoryDto) {
    const existing = await this.repo.findByName(tenantId, data.name);
    if (existing) throw new AppError("Category already exists", 409);
    return this.repo.create(tenantId, data);
  }
}

// ❌ BAD — req/res in service
async create(req: Request, res: Response) { ... }
```

### Controller (`*.controller.ts`)

- Thin HTTP layer only
- Uses `req.user!.tenantId` for tenant context
- Calls service methods
- Returns `res.status().json()` responses
- No Prisma imports, no business logic
- **All methods must be arrow function class fields** — regular `async` methods lose `this` when passed as callbacks to `asyncHandler`

```typescript
// ✅ GOOD — arrow function field preserves `this` when passed to asyncHandler
class CategoryController {
  constructor(private service: CategoryService) {}

  createCategory = async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const body = CreateCategorySchema.parse(req.body);
    const category = await this.service.create(tenantId, body);
    return res.status(201).json({ message: "Category created successfully", category });
  };
}

// ❌ BAD — regular method loses `this` when Express calls it as a callback
class CategoryController {
  async createCategory(req: Request, res: Response) {
    // `this` is undefined here — throws "Cannot read properties of undefined"
    const category = await this.service.create(...);
  }
}

// ❌ BAD — fat controller
createCategory = async (req: Request, res: Response) => {
  if (!req.body.name) return res.status(400).json({ message: "required" });
  const category = await prisma.category.create(...); // use service instead
};
```

### Schema (`*.schema.ts`)

- Zod schemas for all request bodies
- No inline validation in controllers (`if (!name)` is forbidden)

```typescript
export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});
export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
```

### Controller Tests (`*.controller.test.ts`)

- Required for every controller — no exceptions
- Use **Vitest** (`describe`, `it`, `expect`, `vi`, `beforeEach`)
- Call controller methods directly as functions — never spin up an HTTP server
- Always call `vi.clearAllMocks()` in `beforeEach`

**Setup pattern** — declare `vi.mock` at the top level (hoisted by Vitest), then import the mocked default to get a reference to the mock functions:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

// vi.mock is hoisted — must NOT reference outer variables inside the factory
vi.mock("./category.service", () => ({
  CategoryService: vi.fn(),
  default: {
    create: vi.fn(),
    findAll: vi.fn(),
    // ... all methods
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

// Import AFTER vi.mock declarations
import categoryController from "./category.controller";
import * as categoryServiceModule from "./category.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = categoryServiceModule.default as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: "u1", tenantId: "t1", role: "admin", tenantSlug: "acme" },
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

describe("CategoryController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCategory", () => {
    it("returns 201 with created category on success", async () => {
      const category = { id: "1", name: "Shoes" };
      mockService.create.mockResolvedValue(category);
      const req = makeReq({ body: { name: "Shoes" } });
      const res = mockRes() as Response;

      await categoryController.createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ category }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.create.mockRejectedValue(new Error("DB down"));
      const req = makeReq({ body: { name: "Shoes" } });
      const res = mockRes() as Response;

      await categoryController.createCategory(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
```

**Required test cases per handler:**

- Happy path: correct status code and response shape
- Validation error (Zod `parse` failure): 400 with message
- `AppError` thrown by service: matching `statusCode` from the error
- Unexpected error: `sendControllerError` is called

**What NOT to test in controller tests:**

- Business logic — belongs in `*.service.test.ts`
- Database queries — belongs in `*.repository.test.ts`

**Anti-patterns:**

```typescript
// ❌ BAD — never import prisma in a controller test
import prisma from "@/config/prisma";

// ❌ BAD — never use supertest/HTTP server for unit tests
import request from "supertest";
await request(app).post("/categories").send({ name: "Shoes" });

// ❌ BAD — never skip clearAllMocks
// (missing beforeEach with vi.clearAllMocks() causes test bleed)
```

---

## Rule: api-governance

_>_

## API Governance

The AI assistant must behave like a **senior backend engineer performing architectural review**. This rule enforces API documentation synchronization, structured feature flag governance, observability, and input validation.

---

## 1. Rule Objective

1. Ensure **every API change automatically updates Swagger/OpenAPI documentation**.
2. Enforce **structured feature flagging for experimental or staged features**.
3. Prevent undocumented APIs and uncontrolled feature releases.
4. Guarantee **production observability** and **input validation**.

---

## 2. Swagger / OpenAPI Enforcement

Whenever backend API-related files are modified, added, or deleted, the AI **must** ensure Swagger/OpenAPI documentation is updated in the same change.

### API-Related Files

- Controllers (`*.controller.ts`)
- Routes and routers (`*.router.ts`)
- Handlers
- API modules under `apps/api/src/modules/`
- Service files containing HTTP endpoint logic

### Trigger Conditions

The AI **must** update Swagger when any of the following occur:

- A new endpoint is added
- An endpoint is removed
- Request body schema changes
- Response schema changes
- Query parameters change
- Path parameters change
- Authentication requirements change
- Response codes change

### Required Actions

When any of the above occur, the AI **must**:

1. Update the OpenAPI/Swagger specification
2. Update request body schemas (in JSDoc or `swagger.config.ts` components)
3. Update response schemas
4. Update parameters (query, path, headers)
5. Update response examples
6. Update error responses
7. Ensure endpoint tags and summaries exist

### Required Per-Endpoint Fields

Each endpoint **must** include:

- `summary`
- `description`
- `tags`
- `operationId`
- `parameters` (query, path, headers)
- `requestBody` (if applicable)
- `responses` (success + error responses)
- `security` (when auth required)

### Reference Implementation

- Swagger spec: `apps/api/src/config/swagger.config.ts`
- JSDoc pattern: `apps/api/src/modules/auth/auth.router.ts`
- Shared schemas: `components.schemas`, `components.parameters` in swagger.config.ts

### Golden Rule

**Undocumented endpoints are a blocking issue.** If API logic changes but Swagger documentation is not updated, the AI must flag the issue and suggest documentation updates.

---

## 3. Feature Flag Governance

All experimental, incomplete, beta, or rollout-based features **must** be protected using feature flags.

### Central Configuration

Feature flags **must** be centralized. Define them in:

```
apps/api/src/config/featureFlags.ts
```

Feature flags **must** follow this structure:

- Uppercase names
- Descriptive identifiers
- Boolean values

Example naming pattern:

```ts
NEW_DASHBOARD;
AI_RECOMMENDATIONS;
SMART_SEARCH;
EXPERIMENTAL_EDITOR;
```

### Access Pattern

- No experimental feature may be exposed without a feature flag
- **Never** implement feature flag logic using direct environment variable checks
- Feature flags **must** be accessed through a helper function such as `isFeatureEnabled()`

Example:

```ts
if (isFeatureEnabled("AI_RECOMMENDATIONS")) {
  runRecommendationEngine();
}
```

### API Behavior When Disabled

Backend APIs controlled by feature flags **must** return appropriate responses when disabled:

- HTTP 404 (Not Found)
- HTTP 403 (Forbidden)
- A standardized "feature disabled" error response

### Feature Flag Metadata

Each feature flag **must** include metadata comments:

```
AI_RECOMMENDATIONS
description: AI suggestions for search results
owner: AI Team
created: 2026-01-15
removal_target: 2026-04-01
```

The AI should encourage removal of flags once features become stable.

---

## 4. Observability & Logging

Every system must be **debuggable in production**. All APIs must include structured logging, tracing, and error monitoring.

### Required Logging Levels

- INFO
- WARN
- ERROR
- DEBUG

### Required Logging Fields

Every log **must** include (where available):

- `timestamp`
- `request_id`
- `user_id` (if available)
- `endpoint`
- `method`
- `status_code`
- `duration_ms`

### Example Structured Log

```json
{
  "level": "info",
  "request_id": "abc123",
  "endpoint": "/api/v1/users",
  "method": "GET",
  "status_code": 200,
  "duration_ms": 45
}
```

### Request ID Middleware

Every request **must** generate or propagate a request ID. Use:

```ts
app.use(requestIdMiddleware);
```

Reference: `apps/api/src/middlewares/requestId.ts`

### Error Logging

All errors **must** include:

- Stack trace
- Request ID
- User ID (if available)
- Endpoint

Example:

```ts
logger.error("Operation failed", requestId, {
  error,
  endpoint: req.path,
  userId: req.user?.id,
});
```

Reference: `apps/api/src/config/logger.ts`, `apps/api/src/utils/controllerError.ts`

### Metrics Collection

Every API should track:

- `request_count`
- `request_duration`
- `error_rate`

Recommended tools: Prometheus, OpenTelemetry, Grafana.

### Monitoring Integrations

Allowed tools:

- Sentry
- OpenTelemetry
- Datadog
- Grafana Loki

### Enforcement

When an API endpoint is created, ensure:

1. Logging is added
2. Errors are captured
3. Metrics hooks exist
4. Request ID middleware is used

---

## 5. API Validation Enforcement

Every API input **must** be validated using Zod (or yup, class-validator, joi).

**Never trust request input.**

The project uses **Zod** — schemas live in `*.schema.ts` per the api-architecture rule. All `req.body`, `req.query`, and `req.params` must be validated before use.

Example:

```ts
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
const body = schema.parse(req.body);
```

---

## 6. Testing Requirements

If a feature flag exists, tests **must** cover both states:

- Flag **enabled**
- Flag **disabled**

Example:

```ts
describe("AI recommendations endpoint", () => {
  it("returns recommendations when flag enabled", async () => { ... });
  it("returns 404 when flag disabled", async () => { ... });
});
```

---

## 7. Pull Request Review Behavior

When reviewing or generating code changes, the AI **must** verify:

- Swagger documentation is updated for API changes
- Request and response schemas are documented
- New experimental features are protected by feature flags
- Feature flags are defined centrally in `apps/api/src/config/featureFlags.ts`
- Tests exist for both flag states (enabled and disabled)
- Input validation is applied (Zod)
- Logging and error capture are present

---

## 8. Golden Rules

1. **No undocumented API endpoints.** Every endpoint must have complete Swagger/OpenAPI documentation.
2. **No experimental feature released without a feature flag.** All beta, staged, or incomplete features must be gated.

The AI must actively enforce these rules whenever generating, modifying, or reviewing backend or API code.

---

## 9. Golden Engineering Standard

Every backend system must guarantee:

- **Stable APIs** — documented, validated, consistent
- **Clean architecture** — controller → service → repository, shared utilities
- **Production observability** — structured logs, request IDs, metrics, error monitoring

---

## Rule: api-response

_Enforces standardized ok()/fail() response helpers from shared/response/ in all API controllers_

## Standardized API Response Format

All API controllers must use the response helpers from `apps/api/src/shared/response/index.ts`.

## Response Shape

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, message: string }
```

## Helpers

```typescript
// apps/api/src/shared/response/index.ts
export function ok<T>(res: Response, data: T, statusCode = 200): Response {
  return res.status(statusCode).json({ success: true, data });
}

export function fail(
  res: Response,
  message: string,
  statusCode = 400,
): Response {
  return res.status(statusCode).json({ success: false, message });
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; message: string };
```

## Usage Rules

### ✅ ALWAYS use ok() and fail()

```typescript
// Success responses
return ok(res, { category }); // 200
return ok(res, { category }, 201); // 201 Created
return ok(res, { items, pagination }); // 200 with pagination

// Error responses
return fail(res, "Category not found", 404);
return fail(res, "Name is required", 400);
return fail(res, "Unauthorized", 401);
return fail(res, "Something went wrong", 500);
```

### ❌ NEVER use raw res.json() in controllers

```typescript
// BAD — raw responses
res.status(200).json({ category });
res.status(201).json({ message: "created", category });
res.status(400).json({ message: "required" });
res.json({ success: false, error: "..." });

// BAD — inconsistent shapes
res.status(200).json({ data: category });
res.status(200).json({ result: category });
```

## Error Handling in Controllers

Use `sendControllerError` (from `shared/errors/`) for catch blocks:

```typescript
async createCategory(req: Request, res: Response) {
  try {
    const { tenantId } = getAuthContext(req);
    const body = CreateCategorySchema.parse(req.body);
    const category = await this.service.create(tenantId, body);
    return ok(res, { category }, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(res, error.message, error.statusCode);
    }
    return sendControllerError(req, res, error, "createCategory");
  }
}
```

## HTTP Status Code Reference

| Situation          | Status | Helper                     |
| ------------------ | ------ | -------------------------- |
| GET success        | 200    | `ok(res, data)`            |
| POST created       | 201    | `ok(res, data, 201)`       |
| Validation error   | 400    | `fail(res, msg, 400)`      |
| Unauthorized       | 401    | `fail(res, msg, 401)`      |
| Forbidden          | 403    | `fail(res, msg, 403)`      |
| Not found          | 404    | `fail(res, msg, 404)`      |
| Conflict/duplicate | 409    | `fail(res, msg, 409)`      |
| Server error       | 500    | `sendControllerError(...)` |

---

## Rule: api-shared-utilities

_Documents the shared/ directory contracts — errors, auth context, types, and response helpers for the API_

## Shared Utilities (`apps/api/src/shared/`)

The `shared/` directory provides cross-cutting utilities used by all modules. Always import from here — never duplicate these patterns inline.

## Directory Structure

```
apps/api/src/shared/
  errors/
    index.ts          ← AppError, NotFoundError, mapPrismaError()
  auth/
    getAuthContext.ts ← single source of auth truth
  response/
    index.ts          ← ok(), fail(), ApiResponse<T>
  types/
    index.ts          ← AuthContext, AuditAction, AuditResource enums
```

---

## `shared/auth/getAuthContext.ts`

**Always use `getAuthContext(req)` — never access `req.user!` directly.**

```typescript
import { getAuthContext } from "@/shared/auth/getAuthContext";

// ✅ GOOD
async myHandler(req: Request, res: Response) {
  const { tenantId, userId, role } = getAuthContext(req);
  // ...
}

// ❌ BAD — direct req.user access
const tenantId = req.user!.tenantId;
const userId = (req as any).user.id;
```

`AuthContext` shape:

```typescript
interface AuthContext {
  tenantId: string;
  userId: string;
  role: "superAdmin" | "admin" | "user";
}
```

---

## `shared/errors/index.ts`

```typescript
// AppError — for known business errors
throw new AppError("Category already exists", 409);
throw new AppError("Unauthorized", 401);

// NotFoundError — shorthand for 404
throw new NotFoundError("Category");

// mapPrismaError() — maps Prisma error codes to HTTP responses
// P2025 → 404, P2002 → 409, P2003 → 400
const mapped = mapPrismaError(error);

// sendControllerError() — for catch blocks in controllers
// Logs + maps Prisma errors + sends generic 500 if unknown
sendControllerError(req, res, error, "contextMessage");
```

### ✅ Error handling pattern in controllers

```typescript
} catch (error) {
  if (error instanceof AppError) {
    return fail(res, error.message, error.statusCode);
  }
  return sendControllerError(req, res, error, "createCategory");
}
```

---

## `shared/types/index.ts`

```typescript
// Use these enums for audit logging — never hardcode strings
import { AuditAction, AuditResource } from "@/shared/types";

AuditAction.CREATE; // "CREATE"
AuditAction.UPDATE; // "UPDATE"
AuditAction.DELETE; // "DELETE"

AuditResource.CATEGORY; // "CATEGORY"
AuditResource.PRODUCT; // "PRODUCT"
// etc.
```

---

## `shared/response/index.ts`

See `api-response` rule for full details. Quick reference:

```typescript
import { ok, fail } from "@/shared/response";

return ok(res, data); // 200
return ok(res, data, 201); // 201
return fail(res, "msg", 400); // 400
return fail(res, "msg", 404); // 404
```

---

## Import Paths

Use the `@/` alias (maps to `apps/api/src/`):

```typescript
import { getAuthContext } from "@/shared/auth/getAuthContext";
import {
  AppError,
  NotFoundError,
  mapPrismaError,
  sendControllerError,
} from "@/shared/errors";
import { ok, fail, ApiResponse } from "@/shared/response";
import { AuthContext, AuditAction, AuditResource } from "@/shared/types";
```

---

## Rule: auth-enforcement

_Every endpoint must declare auth requirements; default to authenticated_

## Auth Enforcement Rule

All endpoints must explicitly declare who can access them.

## Default

**Assume authenticated.** New endpoints require auth unless explicitly public.

## Public Endpoints (No Auth)

- `POST /auth/login`
- `GET /health`
- `GET /metrics` (for Prometheus)
- Any route mounted before `verifyToken` middleware

## Protected Endpoints

- Mount after `verifyToken` and `resolveTenant`
- Use `authorizeRoles("admin", "superAdmin")` for role-based access
- Use `enforcePlanLimits("users")` for plan-gated features

## Role Hierarchy

- `platformAdmin` — Cross-tenant platform operations
- `superAdmin` — Tenant-level admin
- `admin` — Tenant admin
- `user` — Regular tenant user

## Checklist for New Endpoints

1. Is it public? If yes, mount before auth middleware
2. If protected: which roles? Add `authorizeRoles(...)`
3. Does it need tenant context? Ensure `resolveTenant` runs
4. Is it plan-gated? Add `enforcePlanLimits`

## Golden Rule

**Never expose an endpoint without explicit auth/authz decision.**

---

## Rule: backwards-compatibility

_API changes must be additive or versioned; breaking changes require expand-contract_

## Backwards Compatibility Rule

APIs are contracts. Breaking them breaks clients.

## Additive Changes (Allowed)

1. **New optional fields** — Add new fields with defaults or as optional
2. **New endpoints** — Add new routes without touching existing ones
3. **New enum values** — Add new values; clients that don't know them should ignore
4. **New query params** — Add optional params with sensible defaults

## Breaking Changes (Require Migration)

1. **Removing fields** — Use expand-contract: add deprecation, then remove in next version
2. **Renaming fields** — Support both old and new during transition
3. **Changing types** — e.g. string → number requires version bump or new field
4. **Removing endpoints** — Deprecate first; return 410 Gone after grace period

## Expand-Contract Pattern

1. **Expand** — Add new field/behavior; keep old working
2. **Migrate** — Update all clients to use new
3. **Contract** — Remove old after migration complete

## API Versioning

- Use `/api/v1/` prefix
- Breaking changes → new version `/api/v2/`
- Document deprecation in Swagger and changelog

## Golden Rule

**Never ship a breaking API change without a migration path.**

---

## Rule: error-handling

_No swallowed errors; structured error context required_

## Error Handling Rule

Errors must be visible and debuggable. Silent failures hide bugs.

## Forbidden

1. **Empty catch blocks** — `catch {}` or `catch (e) {}` swallows errors
2. **`console.error` without re-throw** — Logging alone does not propagate the failure
3. **Catching and returning null** — Prefer throwing or returning `Result` type
4. **Ignoring promise rejections** — Use `.catch()` or `try/await`; never leave promises unhandled

## Required

1. **Structured error context** — Include: operation name, identifiers (userId, tenantId, id), requestId
2. **Re-throw after logging** — If you catch and log, re-throw unless you intentionally handle
3. **Use AppError for business errors** — `throw createError("Message", statusCode)`
4. **Use sendControllerError in controllers** — For unexpected errors, let the global handler format the response

## Pattern

```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error("Operation failed", requestId, {
    userId,
    operation: "createX",
    error,
  });
  if (error instanceof AppError) throw error;
  throw error; // or sendControllerError in controller
}
```

## Golden Rule

**Every error must be logged with context and either handled or re-thrown.**

---

## Rule: feature-lock-architecture

_Enforce silent feature locks with zero disabled-feature API calls_

## Feature Lock Architecture

When a feature is disabled by env or plan flags, the system must behave as if that feature does not exist.

## Core Rule

- Disabled features must make **zero API calls**.
- Disabled features must not mount dependent query hooks.
- Disabled features should be hidden (silent no-call), not shown as broken/errored UI.

## Required Gating Layers

Apply all three layers for every gated feature:

1. **Route/Page Guard**
   - Use `EnvFeaturePageGuard` (and `FeaturePageGuard` for plan gating).
   - Block access before page content renders.

2. **Hook-Level Query Guard**
   - Every feature hook that calls API must enforce `enabled`.
   - Combine env/plan gate with optional caller `enabled`:
     - `enabled: isFeatureEnabled && (options?.enabled ?? true)`

3. **Component Mount Guard**
   - Do not call feature-specific hooks unconditionally.
   - Only mount hook consumers/sections/tabs/actions when corresponding feature is enabled.

## CRM Mapping (Current Standard)

- `CRM_DEALS` -> all deals queries/mutations and deals-coupled UI
- `CRM_WORKFLOWS` -> workflow queries/mutations and workflow editor UI
- `CRM_REPORTS` -> CRM reports queries/pages
- `CRM_PIPELINES_TAB` -> pipeline queries/templates/settings tab

## Implementation Pattern

```typescript
const featureEnabled = useEnvFeatureFlag(EnvFeature.CRM_DEALS);

const { data } = useDealsPaginated(params, {
  enabled: featureEnabled,
});
```

```typescript
export function useDealsPaginated(
  params?: DealListParams,
  options?: { enabled?: boolean },
) {
  const featureEnabled = useEnvFeatureFlag(EnvFeature.CRM_DEALS);
  return useQuery({
    queryKey: dealKeys.list(params ?? {}),
    queryFn: () => getDeals(params),
    enabled: featureEnabled && (options?.enabled ?? true),
  });
}
```

## Verification Checklist

- Search all call-sites of changed hook/service and update every caller.
- Confirm route guard exists for gated pages.
- Run `cd apps/web && npx tsc --noEmit`.
- Grep for unguarded hooks in feature modules before finishing.

## Forbidden

- Hiding a tab but leaving underlying queries active
- Calling gated hooks before computing feature flags
- Relying only on backend 403/404 while frontend continues to call disabled endpoints

---

## Rule: frontend-api-contract

_Enforces frontend service/hook alignment whenever API response shapes, endpoints, or schemas change_

## Frontend–API Contract

Whenever you change an API endpoint — response shape, request body, URL, HTTP method, status code, or Zod schema — you **must** search the entire frontend for every caller of that service function and fix them all before finishing.

---

## Step 1 — Find Every Frontend Caller

After changing an API service function signature or return type, run a ripgrep search to find **all** usages across the entire frontend — not just the primary view:

```bash
# Find every file that imports or calls the changed function
rg "getAllUsers|useUsers" apps/web --include="*.ts" --include="*.tsx" -l

# Or for any function name
rg "<functionName>" apps/web --include="*.ts" --include="*.tsx" -l
```

**Do not assume only the primary view uses it.** In this codebase, service functions are called from:

- `views/<module>/` — primary CRUD views
- `views/settings/` — audit logs, error reports, user filters
- `views/analytics/` — filter bars, report dropdowns
- `views/dashboard/` — widgets and KPI cards
- Other `views/` that use the data for dropdowns or filters

---

## Step 2 — Fix Every Caller Pattern

### Return type changed (e.g. `User[]` → `UsersResult`)

Every file that destructures the old shape must be updated:

```typescript
// ❌ BAD — assumes service returns User[] directly
const { data: users = [] } = useUsers({ limit: 500 });
const { data: users = [] } = useQuery({ queryFn: () => getAllUsers(...) });
const users = usersData ?? [];

// ✅ GOOD — extract the array from the new result shape
const { data: usersResult } = useUsers({ limit: 500 });
const users = usersResult?.users ?? [];

const { data: usersResult } = useQuery({ queryFn: () => getAllUsers(...) });
const users = usersResult?.users ?? [];
```

### Function signature changed (e.g. args removed)

Every call site must match the new signature:

```typescript
// ❌ BAD — old 3-arg signature
await changePassword(userId, data.currentPassword, data.newPassword);

// ✅ GOOD — new 2-arg signature
await changePassword(userId, data.newPassword);
```

### Response field renamed or restructured

Update every place that reads the old field name:

```typescript
// ❌ BAD — old field
const total = users.length; // was page count, not real total

// ✅ GOOD — use pagination metadata
const total = usersResult?.pagination?.totalItems ?? 0;
```

---

## Step 3 — Checklist on Every API Change

### Response shape changed

- [ ] Update the matching `interface` in `apps/web/services/<name>Service.ts`
- [ ] Verify the service function reads the correct field (e.g. `response.data.data`, `response.data.user`)
- [ ] If a paginated endpoint returns `{ data, pagination }`, the service must return both — never discard `pagination`
- [ ] **Search all frontend files** for callers and update every destructuring pattern

### Request body / Zod schema changed

- [ ] Update `CreateXxxData` / `UpdateXxxData` interfaces in the service file
- [ ] Update the matching Zod schema in the frontend form component (`views/<name>/components/XxxForm.tsx`)
- [ ] Ensure the exported `XxxFormValues` type covers **both** create and update modes (use the looser update schema)
- [ ] **Search all frontend files** for call sites passing the removed/changed field

### Function signature changed

- [ ] **Search all frontend files** for every call site and update argument lists

### Endpoint URL or HTTP method changed

- [ ] Update every `api.get/post/put/delete(...)` call in `apps/web/services/<name>Service.ts`

### New field added to the API response

- [ ] Add the field to the frontend `interface` so TypeScript catches missing usages

### Field removed from the API response

- [ ] Remove it from the frontend `interface` and fix any code that referenced it

### New query parameter added

- [ ] Add it to `GetAllXxxParams` in the service and pass it through in the hook

---

## Step 4 — Verify with Type-Check

After fixing all callers, run the type-checker. **Both must pass with zero errors.**

```bash
cd apps/web && npx tsc --noEmit
cd apps/api && npx tsc --noEmit
```

Do not consider the task complete until both commands exit cleanly.

---

## File Mapping

| API module            | Frontend service              | Frontend hook          | Primary views     | Also used in                                                                                                                                              |
| --------------------- | ----------------------------- | ---------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/users/`      | `services/userService.ts`     | `hooks/useUser.ts`     | `views/users/`    | `views/settings/UserLogsPage.tsx`, `views/settings/ErrorReportsPage.tsx`, `views/settings/index.tsx`, `views/analytics/components/AnalyticsFilterBar.tsx` |
| `modules/categories/` | `services/categoryService.ts` | `hooks/useCategory.ts` | `views/products/` | `views/analytics/`, `views/sales/`                                                                                                                        |
| `modules/products/`   | `services/productService.ts`  | `hooks/useProduct.ts`  | `views/products/` | `views/analytics/`, `views/sales/`, `views/dashboard/`                                                                                                    |
| `modules/auth/`       | `services/authService.ts`     | `hooks/useAuth.ts`     | `views/auth/`     | —                                                                                                                                                         |

Update the "Also used in" column whenever you discover a new caller.

---

## Real Examples of This Going Wrong

These bugs were introduced by changing `getAllUsers` return type from `User[]` to `UsersResult` without updating all callers:

```typescript
// views/analytics/components/AnalyticsFilterBar.tsx — BROKE
const { data: users = [] } = useUsers({ limit: 500 });
// users was now UsersResult, not User[] — .map() failed at runtime

// views/settings/ErrorReportsPage.tsx — BROKE
const { data: users = [] } = useQuery({ queryFn: () => getAllUsers(...) });

// views/settings/UserLogsPage.tsx — BROKE
const users = usersData ?? [];  // usersData was UsersResult, not User[]

// views/settings/index.tsx — BROKE
await changePassword(userId, data.currentPassword, data.newPassword);
// changePassword signature was reduced to 2 args — TS error at call site
```

All four were caught by `tsc --noEmit` — which is why running it after every API change is mandatory.

---

## Rule: frontend-architecture

_>_

## Frontend Architecture

Stack: **Next.js App Router · React 19 · TypeScript 5 · Tailwind CSS v4 · shadcn/ui · TanStack Query v5 · Zustand v5 · React Hook Form v7 · Zod v3 · Axios**

---

## 1. Architecture Overview

### Philosophy

This codebase follows **Feature-Based Clean Architecture**. Every piece of code belongs to either a _feature module_ or a _shared module_. Features are vertical slices — each slice owns its UI, state, API calls, types, and validation. Shared modules are horizontal utilities consumed by any feature.

This is deliberately **not** a type-based structure (i.e., not `components/`, `hooks/`, `services/` at the root for all features). Type-based structures collapse under team growth: files become impossible to navigate, ownership blurs, and cross-feature coupling silently accumulates.

**Why feature-based:**

- A developer working on `products` touches only `features/products/` — no grep required.
- Features can be extracted, replaced, or deleted without touching unrelated code.
- Ownership is explicit: the team that owns the feature owns the folder.
- Onboarding is faster: new developers read one feature folder to understand the full vertical slice.

### Backend → Frontend Layer Mapping

The backend enforces a strict 3-layer architecture. The frontend mirrors it:

| Backend           | Frontend Equivalent                          | Responsibility                                       |
| ----------------- | -------------------------------------------- | ---------------------------------------------------- |
| `*.repository.ts` | `features/<name>/services/<name>.service.ts` | HTTP calls only — no React, no state                 |
| `*.service.ts`    | `features/<name>/hooks/use<Name>.ts`         | Orchestration — React Query, mutations, side-effects |
| `*.controller.ts` | `features/<name>/components/<Name>Page.tsx`  | UI composition — renders, no business logic          |
| `*.schema.ts`     | `features/<name>/validation.ts`              | Zod schemas — single source of truth for shape       |
| `*.types.ts`      | `features/<name>/types.ts`                   | DTOs, interfaces, enums                              |

### Dependency Direction

```
app/[workspace]/page.tsx
  └─ features/<name>/components/<Name>Page.tsx   ← UI composition
       └─ features/<name>/hooks/use<Name>.ts      ← orchestration
            ├─ features/<name>/services/<name>.service.ts  ← HTTP
            │    └─ lib/axios.ts                           ← shared transport
            └─ store/<name>-store.ts (read-only selectors) ← global UI state
```

**Rule: dependencies only flow downward. No layer may import from a layer above it.**

---

## 2. Folder Structure

```
apps/web/
├── app/                          # Next.js App Router — routing ONLY
│   └── [workspace]/
│       ├── (admin)/              # Route group: authenticated admin routes
│       │   ├── products/
│       │   │   └── page.tsx      # Thin shell: imports from features/products
│       │   └── layout.tsx        # AuthGuard + DashboardLayout
│       └── (superadmin)/
│
├── features/                     # ONE folder per vertical feature slice
│   ├── auth/
│   ├── products/
│   ├── sales/
│   └── ...
│
├── components/                   # Shared UI only — no feature-specific logic
│   ├── ui/                       # shadcn/ui primitives (Button, Dialog, Table…)
│   ├── layout/                   # DashboardLayout, Sidebar, TopBar
│   ├── auth/                     # AuthGuard, RoleGuard (shared auth wrappers)
│   └── providers/                # QueryClientProvider, ThemeProvider
│
├── hooks/                        # Shared hooks used by 2+ features
│   ├── use-debounce.ts
│   ├── use-pagination.ts
│   └── use-local-storage.ts
│
├── lib/                          # Infrastructure — no React
│   ├── axios.ts                  # Single Axios instance with interceptors
│   ├── api-error.ts              # handleApiError() utility
│   └── query-client.ts           # TanStack QueryClient singleton
│
├── store/                        # Zustand stores — global UI state only
│   ├── auth-store.ts
│   ├── sidebar-store.ts
│   └── create-selection-store.ts # Factory for row-selection stores
│
├── types/                        # Global TypeScript types shared across features
│   ├── api.ts                    # PaginatedResponse<T>, ApiError, etc.
│   └── auth.ts                   # User, TenantContext, Role enums
│
├── utils/                        # Pure functions — no React, no side-effects
│   ├── format.ts                 # formatCurrency, formatDate
│   ├── cn.ts                     # Tailwind class merge utility
│   └── auth.ts                   # Token helpers
│
└── constants/                    # App-wide constants
    ├── routes.ts                 # Typed route builders
    └── query-keys.ts             # Shared query key namespaces
```

### Folder Rules

- `app/` contains **only** Next.js routing files (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`). Zero business logic. Zero direct API calls.
- `features/` is the primary development target. All new feature work starts here.
- `components/` is for UI primitives and layout shells shared across 2+ features. If a component is used by exactly one feature, it lives inside that feature.
- `hooks/` at the root is for generic utility hooks (debounce, pagination, local storage). Feature-specific hooks live inside the feature.
- `lib/` contains infrastructure setup. Nothing in `lib/` may import from `features/`, `components/`, or `store/`.
- `store/` contains only Zustand stores for global UI state. Server/async state lives in React Query, not here.
- `utils/` contains pure functions. No `useState`, no `useEffect`, no imports from React.

---

## 3. Feature Module Structure

Every feature under `features/` must follow this exact structure:

```
features/{feature-name}/
├── components/
│   ├── {FeatureName}Page.tsx     # Top-level page component (composed from below)
│   ├── {Entity}Form.tsx          # Form component
│   ├── {Entity}Table.tsx         # Table/list component
│   └── {Entity}Detail.tsx        # Detail/view component
├── hooks/
│   ├── use-{entity}.ts           # Primary data hook (list + CRUD)
│   └── use-{entity}-form.ts      # Form state hook (if complex)
├── services/
│   └── {feature}.service.ts      # All HTTP calls for this feature
├── types.ts                      # DTOs, form value types, enums
├── validation.ts                 # Zod schemas
└── index.ts                      # Public API — explicit re-exports only
```

### `components/` — UI Only

- Render data passed via props or returned from hooks.
- **Must not** call `fetch`, `axios`, or any service function directly.
- **Must not** contain business logic (calculations, transformations, conditionals that belong in a service).
- Use `useXxx` hooks from the same feature's `hooks/` folder for all state and data.
- Accept callbacks (`onSuccess`, `onError`, `onChange`) as props — never handle navigation or toasts internally unless the component is a page-level component.

```tsx
// ✅ GOOD — pure UI component
interface ProductTableProps {
  products: Product[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProductTable({
  products,
  isLoading,
  onEdit,
  onDelete,
}: ProductTableProps) {
  if (isLoading) return <TableSkeleton />;
  return (
    <Table>
      {products.map((p) => (
        <ProductRow
          key={p.id}
          product={p}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </Table>
  );
}

// ❌ BAD — component fetching its own data
export function ProductTable() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    axios.get("/products").then((r) => setProducts(r.data));
  }, []);
  // ...
}
```

### `hooks/` — Orchestration

- Wrap service calls in `useQuery` / `useMutation` from TanStack Query.
- Own all cache invalidation logic.
- Own toast notifications for mutations (success/error).
- Own navigation side-effects after mutations (`router.push`).
- **Must not** contain JSX.
- **Must not** import from `components/`.

```tsx
// ✅ GOOD
export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productService.getAll(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: productService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast({ title: "Product created" });
    },
    onError: (error) => {
      toast({ title: "Failed to create product", variant: "destructive" });
    },
  });
}
```

### `services/` — HTTP Layer

- Pure async functions. No React hooks, no `useState`, no `useEffect`.
- One file per feature: `{feature}.service.ts`.
- All request/response types are defined in the feature's `types.ts` and imported here.
- Call `handleApiError()` from `lib/api-error.ts` in catch blocks.
- Use the shared Axios instance from `lib/axios.ts` — never create a new Axios instance.

```tsx
// ✅ GOOD
import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type {
  Product,
  CreateProductData,
  ProductListParams,
  PaginatedProductsResponse,
} from "../types";

export const productService = {
  async getAll(params: ProductListParams): Promise<PaginatedProductsResponse> {
    try {
      const { data } = await api.get("/products", { params });
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async create(payload: CreateProductData): Promise<Product> {
    try {
      const { data } = await api.post("/products", payload);
      return data.product;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
```

### `types.ts` — DTOs and Interfaces

- Defines all TypeScript interfaces for the feature: request payloads, response shapes, form value types, enums.
- **Never** import from `services/` or `hooks/` — types are the foundation, nothing depends on them except everything else.
- Form value types are named `{Entity}FormValues`.
- API response types are named `{Entity}` (singular) and `Paginated{Entity}Response`.
- API request types are named `Create{Entity}Data` and `Update{Entity}Data`.

```typescript
// features/products/types.ts
export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  tenantId: string;
  createdAt: string;
}

export interface CreateProductData {
  name: string;
  sku: string;
  price: number;
  categoryId: string;
}

export interface UpdateProductData extends Partial<CreateProductData> {}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}

export interface PaginatedProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ProductFormValues {
  name: string;
  sku: string;
  price: string; // string in form, coerced to number on submit
  categoryId: string;
}
```

### `validation.ts` — Zod Schemas

- One file per feature containing all Zod schemas for that feature.
- Schema names: `{Entity}Schema`, `Create{Entity}Schema`, `Update{Entity}Schema`.
- Export inferred types alongside schemas: `export type CreateProductInput = z.infer<typeof CreateProductSchema>`.
- Used in both form validation (`zodResolver`) and API response parsing.

```typescript
// features/products/validation.ts
import { z } from "zod";

export const CreateProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  sku: z.string().min(1, "SKU is required").max(50),
  price: z.coerce.number().positive("Price must be positive"),
  categoryId: z.string().uuid("Invalid category"),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
```

### `index.ts` — Public API

- The **only** file other features or `app/` pages may import from.
- Explicitly re-export only what is intended to be public.
- Never re-export internal implementation details.

```typescript
// features/products/index.ts
export { ProductsPage } from "./components/ProductsPage";
export { useProducts, useCreateProduct } from "./hooks/use-products";
export type { Product, ProductFormValues } from "./types";
```

---

## 4. Layer Responsibilities

### Strict Rules

| Layer                    | May Import                                                   | Must NOT Import                           |
| ------------------------ | ------------------------------------------------------------ | ----------------------------------------- |
| `app/page.tsx`           | `features/*/index.ts`, `components/`                         | Services, hooks directly, stores          |
| `features/*/components/` | Feature hooks, shared `components/`, `utils/`, `constants/`  | Other features directly, services, stores |
| `features/*/hooks/`      | Feature services, `store/`, `lib/`, `utils/`, TanStack Query | Components, other feature hooks           |
| `features/*/services/`   | `lib/axios.ts`, `lib/api-error.ts`, feature `types.ts`       | React, hooks, components, stores          |
| `store/`                 | `lib/`, `utils/`, `types/`                                   | Features, components, hooks               |
| `lib/`                   | External packages only                                       | Anything in `apps/web/`                   |

### Server vs Client Component Rules

**Default to Server Components.** Add `"use client"` only when required.

A component **must** be a Server Component when:

- It fetches data directly (database, internal API via `fetch`)
- It renders static or infrequently-changing content
- It has no interactivity (no event handlers, no browser APIs)
- It is a layout, page shell, or data-loading boundary

A component **must** be a Client Component (`"use client"`) when:

- It uses `useState`, `useEffect`, `useRef`, or any React hook
- It uses browser APIs (`window`, `document`, `localStorage`)
- It uses TanStack Query (`useQuery`, `useMutation`)
- It uses Zustand stores
- It handles user events (`onClick`, `onChange`, `onSubmit`)
- It uses `useRouter`, `useSearchParams`, `usePathname`

**Push `"use client"` as far down the tree as possible.** A page should be a Server Component that imports a single Client Component boundary at the interactive leaf.

```tsx
// ✅ GOOD — page is a Server Component
// app/[workspace]/(admin)/products/page.tsx
import { ProductsPage } from "@/features/products";

export default function Page() {
  return <ProductsPage />; // ProductsPage is "use client"
}

// ✅ GOOD — server component fetches, passes to client leaf
// app/[workspace]/(admin)/products/[id]/page.tsx
import { getProduct } from "@/features/products/services/product.service";
import { ProductDetailClient } from "@/features/products/components/ProductDetailClient";

export default async function Page({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id); // Server-side fetch
  return <ProductDetailClient initialData={product} />;
}
```

---

## 5. Data Fetching Strategy

### Decision Tree

```
Does the data need to be indexed by search engines or rendered on first paint?
  YES → Server Component with direct fetch() or service call
  NO  → Does the data change based on user interaction?
          YES → TanStack Query (useQuery) in a Client Component
          NO  → Server Component with fetch() + revalidation
```

### Server Components — When to Use

- Initial page data that does not depend on client-side state
- SEO-critical content
- Data that can be fetched once and passed as props

```tsx
// ✅ GOOD — Server Component data fetch
export default async function ProductsPage() {
  const products = await productService.getAll({ page: 1, limit: 20 });
  return <ProductList initialProducts={products} />;
}
```

### TanStack Query — When to Use

- Any data that changes based on user filters, search, or pagination
- Data that must stay fresh after mutations
- Optimistic updates
- Background refetching

**Query key conventions** — every feature defines a key factory:

```typescript
// features/products/hooks/use-products.ts
export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (params: ProductListParams) =>
    [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};
```

**Stale time defaults:**

| Data type                              | `staleTime`                              |
| -------------------------------------- | ---------------------------------------- |
| User/auth data                         | `Infinity` (invalidate on mutation only) |
| Reference data (categories, locations) | `10 * 60 * 1000` (10 min)                |
| List data (products, sales)            | `2 * 60 * 1000` (2 min)                  |
| Real-time data (inventory levels)      | `0` (always refetch)                     |

### Caching and Revalidation

- Use `queryClient.invalidateQueries({ queryKey: productKeys.lists() })` after every mutation — never invalidate `productKeys.all` (too broad).
- Use `queryClient.setQueryData` for optimistic updates on simple mutations.
- For Next.js `fetch()` in Server Components, use `{ next: { revalidate: 60 } }` for reference data and `{ cache: "no-store" }` for user-specific data.
- Never use `refetchInterval` unless the feature explicitly requires polling (e.g., live order status).

### Where to Put Fetch Logic

| Scenario                  | Location                                                         |
| ------------------------- | ---------------------------------------------------------------- |
| Server-side initial data  | `app/[workspace]/*/page.tsx` or feature service called from page |
| Client-side reactive data | Feature hook (`use-{entity}.ts`) wrapping `useQuery`             |
| One-off imperative fetch  | Feature service called directly inside a mutation's `mutationFn` |
| Shared across features    | `hooks/use-{shared-concept}.ts` wrapping `useQuery`              |

---

## 6. State Management Rules

### State Type Decision

```
Is the state server/async data?
  YES → TanStack Query (useQuery / useMutation)
  NO  → Is it needed by more than one component in the same tree?
          NO  → useState (local)
          YES → Is it needed across unrelated parts of the app?
                  NO  → Lift state up or use React Context
                  YES → Zustand store
```

### Local State (`useState`)

Use for:

- Form field values (when not using React Hook Form)
- UI toggles: `isOpen`, `isExpanded`, `activeTab`
- Transient input state before submission
- Component-internal animation state

```tsx
const [isOpen, setIsOpen] = useState(false);
const [activeTab, setActiveTab] = useState<"details" | "history">("details");
```

### Server State (TanStack Query)

Use for **all** async data from the API. This is not optional.

```tsx
// ✅ REQUIRED pattern for all API data
const { data, isLoading, error } = useProducts(params);
const createProduct = useCreateProduct();
```

Never mirror server state into `useState` or Zustand:

```tsx
// ❌ FORBIDDEN — duplicating server state into local state
const { data } = useProducts(params);
const [products, setProducts] = useState(data?.products ?? []);
```

### Global UI State (Zustand)

Use only for:

- Auth session (`auth-store.ts`) — user, token, tenant slug
- UI shell state (`sidebar-store.ts`) — sidebar open/collapsed
- Cross-feature selection state (`*-selection-store.ts`) — selected row IDs

**Zustand store rules:**

- One store per concern. Never put unrelated state in one store.
- Export named selectors to prevent unnecessary re-renders: `export const selectUser = (s: AuthStore) => s.user`.
- Stores that need to persist across page refreshes use `persist` middleware with `cookieStorage` (for SSR compatibility) or `localStorage`.
- Stores must be typed with an explicit interface.

```typescript
// ✅ GOOD — typed, selector-exported Zustand store
interface SidebarStore {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isOpen: true,
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  close: () => set({ isOpen: false }),
}));

export const selectSidebarOpen = (s: SidebarStore) => s.isOpen;

// Usage — only re-renders when isOpen changes
const isOpen = useSidebarStore(selectSidebarOpen);
```

### When NOT to Use Global State

- **Never** put form state in Zustand. Use React Hook Form.
- **Never** put server/API data in Zustand. Use TanStack Query.
- **Never** put per-page filter/sort/pagination state in Zustand. Use `useSearchParams` or local state.
- **Never** create a Zustand store for state that only one component uses.

---

## 7. Naming Conventions

### Components

| Type                  | Convention                         | Example                                 |
| --------------------- | ---------------------------------- | --------------------------------------- |
| Page component        | `{Feature}Page`                    | `ProductsPage`, `NewSalePage`           |
| Form component        | `{Entity}Form`                     | `ProductForm`, `LoginForm`              |
| Table/list component  | `{Entity}Table` or `{Entity}List`  | `ProductTable`, `OrderList`             |
| Detail/view component | `{Entity}Detail` or `{Entity}Card` | `ProductDetail`, `UserCard`             |
| Dialog/modal          | `{Entity}{Action}Dialog`           | `DeleteProductDialog`, `EditUserDialog` |
| Shared UI primitive   | Single noun or adjective-noun      | `Button`, `DataTable`, `SearchInput`    |

### Hooks

| Type               | Convention               | Example                              |
| ------------------ | ------------------------ | ------------------------------------ |
| Data query hook    | `use{Entities}` (plural) | `useProducts`, `useOrders`           |
| Single entity hook | `use{Entity}(id)`        | `useProduct(id)`, `useUser(id)`      |
| Mutation hook      | `use{Action}{Entity}`    | `useCreateProduct`, `useDeleteOrder` |
| Form hook          | `use{Entity}Form`        | `useProductForm`, `useLoginForm`     |
| Utility hook       | `use{Concept}`           | `useDebounce`, `usePagination`       |
| Store hook         | `use{Store}Store`        | `useAuthStore`, `useSidebarStore`    |

### Services

| Type            | Convention                                 | Example                                           |
| --------------- | ------------------------------------------ | ------------------------------------------------- |
| Service object  | `{feature}Service` (camelCase)             | `productService`, `authService`                   |
| Service methods | camelCase verbs                            | `getAll`, `getById`, `create`, `update`, `delete` |
| Request type    | `Create{Entity}Data`, `Update{Entity}Data` | `CreateProductData`                               |
| Response type   | `{Entity}`, `Paginated{Entity}Response`    | `Product`, `PaginatedProductsResponse`            |
| Params type     | `{Entity}ListParams`                       | `ProductListParams`                               |

### Files

| Type            | Convention                                                      | Example                                        |
| --------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| Component file  | `{ComponentName}.tsx` (PascalCase)                              | `ProductForm.tsx`, `LoginPage.tsx`             |
| Hook file       | `use-{concept}.ts` (kebab-case)                                 | `use-products.ts`, `use-debounce.ts`           |
| Service file    | `{feature}.service.ts` (kebab-case)                             | `product.service.ts`, `auth.service.ts`        |
| Store file      | `{concept}-store.ts` (kebab-case)                               | `auth-store.ts`, `sidebar-store.ts`            |
| Types file      | `types.ts` inside feature, or `{concept}.ts` in global `types/` | `types.ts`, `api.ts`                           |
| Validation file | `validation.ts` inside feature                                  | `validation.ts`                                |
| Test file       | `{filename}.test.ts(x)` co-located                              | `use-products.test.ts`, `ProductForm.test.tsx` |

### Folders

- Feature folders: `kebab-case` matching the domain noun (`products`, `sales`, `auth`, `crm`)
- Component sub-folders inside features: `components/`, `hooks/`, `services/`
- Route groups: lowercase with parentheses `(admin)`, `(superadmin)`
- Dynamic segments: `[workspace]`, `[id]`

---

## 8. Dependency Flow Rules

### Unidirectional Dependency Graph

```
app/ (routing shell)
  │
  ▼
features/<name>/components/  (UI composition)
  │
  ▼
features/<name>/hooks/        (orchestration)
  │           │
  ▼           ▼
features/<name>/services/    store/
  │
  ▼
lib/axios.ts                  (transport)
  │
  ▼
External API
```

### Cross-Feature Rules

**Features must not import from each other directly.** This is the single most important rule for long-term maintainability.

```typescript
// ❌ FORBIDDEN — direct cross-feature import
// features/sales/hooks/use-sales.ts
import { useProducts } from "@/features/products/hooks/use-products";

// ✅ CORRECT — shared data goes through shared hooks or is passed as props
// hooks/use-product-lookup.ts  (shared hook)
export function useProductLookup(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => productService.getById(id),
  });
}
```

When two features need the same data:

1. Extract the shared hook to `hooks/` (root-level shared hooks).
2. Extract the shared service call to `lib/` if it is pure HTTP with no React.
3. Pass data as props from a parent page component that composes both features.

### Shared Module Rules

Code belongs in a shared module when it is used by **2 or more** features. Do not pre-emptively share — wait for the second consumer.

| Shared concern        | Location                          |
| --------------------- | --------------------------------- |
| Generic UI components | `components/ui/` or `components/` |
| Generic hooks         | `hooks/`                          |
| HTTP transport        | `lib/axios.ts`                    |
| Error handling        | `lib/api-error.ts`                |
| Global types          | `types/`                          |
| Pure utilities        | `utils/`                          |
| Constants / routes    | `constants/`                      |

### Circular Dependency Prevention

- `lib/` never imports from `features/`, `store/`, `components/`, or `hooks/`.
- `utils/` never imports from `lib/`, `features/`, `store/`, or `components/`.
- `types/` never imports from anywhere in the project.
- `store/` never imports from `features/` or `components/`.

Run `madge --circular apps/web/src` in CI to catch circular imports automatically.

---

## 9. Testing Strategy

### Test File Location

Co-locate tests with the code they test:

```
features/products/
├── components/
│   ├── ProductForm.tsx
│   └── ProductForm.test.tsx      ← unit test for the component
├── hooks/
│   ├── use-products.ts
│   └── use-products.test.ts      ← unit test for the hook
├── services/
│   ├── product.service.ts
│   └── product.service.test.ts   ← unit test for the service
└── validation.ts
    (tested inline in service/hook tests)
```

E2E tests live separately:

```
apps/web/e2e/
├── products/
│   ├── product-crud.spec.ts
│   └── product-search.spec.ts
└── auth/
    └── login.spec.ts
```

### What to Test at Each Layer

**Service layer** (`*.service.test.ts`):

- Mock Axios with `vi.mock("@/lib/axios")`
- Test that correct HTTP method, URL, and payload are used
- Test error handling — `handleApiError` is called on failure
- Do NOT test business logic here

```typescript
it("calls POST /products with correct payload", async () => {
  const mockPost = vi
    .spyOn(api, "post")
    .mockResolvedValue({ data: { product: mockProduct } });
  await productService.create({
    name: "Shoes",
    sku: "SH-001",
    price: 99,
    categoryId: "cat-1",
  });
  expect(mockPost).toHaveBeenCalledWith(
    "/products",
    expect.objectContaining({ name: "Shoes" }),
  );
});
```

**Hook layer** (`*.test.ts` with `renderHook`):

- Wrap in `QueryClientWrapper` test helper
- Test loading, success, and error states
- Test that `queryClient.invalidateQueries` is called after mutations
- Mock the service layer with `vi.mock`

```typescript
it("invalidates product list after create", async () => {
  vi.mocked(productService.create).mockResolvedValue(mockProduct);
  const { result } = renderHook(() => useCreateProduct(), {
    wrapper: QueryClientWrapper,
  });
  await act(() => result.current.mutateAsync(mockPayload));
  expect(queryClient.getQueryState(productKeys.lists())).toBeUndefined(); // invalidated
});
```

**Component layer** (`*.test.tsx` with React Testing Library):

- Test rendered output, not implementation details
- Test user interactions: fill form, click button, see result
- Mock hooks with `vi.mock` — never mock services directly in component tests
- Test accessibility: labels, ARIA roles, keyboard navigation

```typescript
it("submits form with correct values", async () => {
  const onSubmit = vi.fn();
  render(<ProductForm onSubmit={onSubmit} />);
  await userEvent.type(screen.getByLabelText("Name"), "Shoes");
  await userEvent.click(screen.getByRole("button", { name: "Create Product" }));
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Shoes" }));
});
```

**E2E layer** (Playwright):

- Test critical user journeys end-to-end against a real (test) backend
- Use Page Object Model — one class per page/feature
- Test happy path + one key error path per journey
- Never test implementation details — only what the user sees

### Coverage Targets

| Layer      | Target                              |
| ---------- | ----------------------------------- |
| Services   | 90%+ (pure functions, easy to test) |
| Hooks      | 80%+                                |
| Components | 70%+ (focus on interaction paths)   |
| E2E        | All critical user journeys          |

---

## 10. Feature Flag Governance

### Philosophy

Feature flags allow safe deployment of incomplete or experimental features without exposing them to users.

All experimental, beta, staged rollout, or environment-specific features **must** be controlled by feature flags.

Feature flags prevent:

- Incomplete UI appearing in production
- Accidental feature exposure
- Unsafe deployments
- Risky releases

Feature flags are a **deployment safety mechanism**, not a long-term configuration system. Flags must be removed once the feature becomes stable.

---

### Feature Flag Location

All feature flags must be centralized. Create a single configuration module:

```
apps/web/constants/feature-flags.ts
```

No other location may define flags.

Example structure:

```ts
export const FEATURE_FLAGS = {
  NEW_DASHBOARD: false,
  AI_RECOMMENDATIONS: false,
  ADVANCED_ANALYTICS: false,
  SALES_PREDICTIONS: false,
  EXPERIMENTAL_CHECKOUT: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
```

---

### Feature Flag Helper

Feature flags must never be accessed directly. Create a helper utility:

```
apps/web/lib/feature-flags.ts
```

Example:

```ts
import { FEATURE_FLAGS, FeatureFlag } from "@/constants/feature-flags";

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] === true;
}
```

Usage must always go through this helper. Direct access like `FEATURE_FLAGS.NEW_DASHBOARD` is forbidden.

---

### Component Usage

Components must conditionally render features using `isFeatureEnabled`.

Example:

```tsx
if (!isFeatureEnabled("AI_RECOMMENDATIONS")) {
  return null;
}
```

Or:

```tsx
{
  isFeatureEnabled("AI_RECOMMENDATIONS") && <AiRecommendationPanel />;
}
```

Rules:

- Do not render hidden UI
- Do not render disabled buttons
- Do not show placeholders for disabled features

Disabled features should behave as if they **do not exist**.

---

### Page-Level Feature Flags

Entire pages may be gated.

Example:

```tsx
if (!isFeatureEnabled("ADVANCED_ANALYTICS")) {
  notFound();
}
```

This ensures that unfinished routes are not exposed.

---

### Feature Flags in Hooks

Hooks may check flags to disable logic.

Example:

```ts
export function useSalesPrediction() {
  if (!isFeatureEnabled("SALES_PREDICTIONS")) {
    return { data: null, isDisabled: true };
  }

  return useQuery({
    queryKey: ["salesPrediction"],
    queryFn: fetchPrediction,
  });
}
```

Rules:

- Hooks must return a stable interface even when disabled
- Avoid conditional hook execution when possible

---

### Feature Flags in Navigation

Sidebar, menus, and navigation items must respect feature flags.

Example:

```tsx
const items = [
  { label: "Dashboard", href: routes.dashboard },
  ...(isFeatureEnabled("ADVANCED_ANALYTICS")
    ? [{ label: "Analytics", href: routes.analytics }]
    : []),
];
```

Disabled features must **not** appear in navigation.

---

### Feature Flags for API Usage

Frontend must not call backend APIs for disabled features.

Example:

```ts
if (!isFeatureEnabled("AI_RECOMMENDATIONS")) {
  return;
}
```

Services should only be called when the feature is enabled.

---

### Environment-Based Flags

Flags may vary by environment.

Example:

- `development` — many experimental features enabled
- `staging` — selected beta features
- `production` — stable features only

Environment overrides must live in:

```
apps/web/constants/feature-flags.env.ts
```

Example:

```ts
export const ENV_FEATURE_FLAGS = {
  development: {
    AI_RECOMMENDATIONS: true,
  },
};
```

---

### Feature Flag Metadata

Each feature flag must include metadata comments:

```
NEW_DASHBOARD
description: redesigned dashboard UI
owner: frontend-team
created: 2026-03-01
removal_target: 2026-05-01
```

The AI should encourage removing flags when the removal date passes.

---

### Testing Requirements

Tests must verify behavior for both flag states.

Example:

```ts
describe("AI recommendations", () => {
  it("does not render when flag disabled", () => {});
  it("renders when flag enabled", () => {});
});
```

---

### Forbidden Patterns

The following are strictly forbidden:

- Direct `process.env` checks inside components
- Defining feature flags inside components
- Defining feature flags inside features
- Scattered feature flag definitions
- Rendering hidden experimental UI
- API calls for disabled features

---

### Golden Rule

Every experimental feature must be protected by a feature flag. No incomplete feature should be visible in production. Feature flags must be centralized, typed, and temporary.

---

## 11. Auth Feature — Full Example

This is the canonical reference implementation. All other features follow this pattern.

### File Structure

```
features/auth/
├── components/
│   ├── LoginForm.tsx
│   └── LoginPage.tsx
├── hooks/
│   └── use-login.ts
├── services/
│   └── auth.service.ts
├── types.ts
├── validation.ts
└── index.ts
```

### `features/auth/types.ts`

```typescript
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "superadmin" | "staff";
  tenantId: string;
  tenantSlug: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

export interface LoginFormValues {
  email: string;
  password: string;
}
```

### `features/auth/validation.ts`

```typescript
import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof LoginSchema>;
```

### `features/auth/services/auth.service.ts`

```typescript
import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { LoginCredentials, LoginResponse } from "../types";

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const { data } = await api.post<LoginResponse>(
        "/auth/login",
        credentials,
      );
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getMe(): Promise<AuthUser> {
    try {
      const { data } = await api.get<{ user: AuthUser }>("/auth/me");
      return data.user;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
```

### `features/auth/hooks/use-login.ts`

```typescript
"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authService } from "../services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import { routes } from "@/constants/routes";
import type { LoginCredentials } from "../types";

export function useLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      authService.login(credentials),
    onSuccess: ({ user, token }) => {
      setAuth({ user, token });
      router.push(routes.dashboard(user.tenantSlug));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? "Login failed. Please try again.");
    },
  });
}
```

### `features/auth/components/LoginForm.tsx`

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginSchema, type LoginInput } from "../validation";

interface LoginFormProps {
  onSubmit: (values: LoginInput) => void;
  isLoading: boolean;
}

export function LoginForm({ onSubmit, isLoading }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p
              id="email-error"
              role="alert"
              className="text-sm text-destructive mt-1"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p
              id="password-error"
              role="alert"
              className="text-sm text-destructive mt-1"
            >
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? "Signing in…" : "Sign in"}
        </Button>
      </div>
    </form>
  );
}
```

### `features/auth/components/LoginPage.tsx`

```tsx
"use client";

import { LoginForm } from "./LoginForm";
import { useLogin } from "../hooks/use-login";

export function LoginPage() {
  const login = useLogin();

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-xl border bg-card shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your credentials to continue
          </p>
        </div>
        <LoginForm onSubmit={login.mutate} isLoading={login.isPending} />
      </div>
    </main>
  );
}
```

### `app/login/page.tsx` — Page Shell

```tsx
// Server Component — no "use client"
import { LoginPage } from "@/features/auth";

export const metadata = { title: "Sign in" };

export default function Page() {
  return <LoginPage />;
}
```

### `features/auth/index.ts`

```typescript
export { LoginPage } from "./components/LoginPage";
export { useLogin } from "./hooks/use-login";
export { authService } from "./services/auth.service";
export type { AuthUser, LoginFormValues } from "./types";
```

---

## 12. Feature Flag Control Plane Architecture

This section defines a **centralized feature flag control plane** used to manage feature rollout across the entire platform.

The architecture must support:

- central dashboard management
- edge distribution
- server-side and client-side flag evaluation
- multi-tenant flags
- region-specific rollout
- user cohort rollout
- percentage rollouts
- kill switches
- experiment tracking

This system should follow production-grade practices used by companies like Shopify, Vercel, and Stripe.

---

### Architecture Overview

The feature flag system must consist of four layers:

1. Feature Flag Control Plane (dashboard + API)
2. Edge Distribution Layer
3. Backend Flag Evaluation
4. Frontend Flag Consumption

---

### 1. Feature Flag Control Plane

Feature flags must be managed from a central dashboard.

The dashboard allows engineers and product managers to:

- create feature flags
- toggle flags
- define rollout rules
- define percentage rollouts
- target tenants
- target regions
- target user cohorts
- enable kill switches

Dashboard API example:

```
GET /api/feature-flags
POST /api/feature-flags
PATCH /api/feature-flags/:flag
```

Example response:

```json
{
  "flags": {
    "NEW_DASHBOARD": {
      "enabled": true,
      "rollout": 50,
      "regions": ["us", "eu"],
      "tenants": ["enterprise"],
      "type": "release"
    },
    "CHECKOUT_VARIANT_B": {
      "enabled": true,
      "type": "experiment"
    },
    "DISABLE_AI_SYSTEM": {
      "enabled": false,
      "type": "ops"
    }
  }
}
```

---

### 2. Edge Distribution Layer

Feature flags must be cached at the edge.

Edge middleware fetches flags and injects them into requests.

Location:

```
middleware.ts
```

Example logic:

```
1. request arrives
2. edge middleware fetches feature flags
3. flags cached in edge cache
4. flags injected into request headers
```

Example header:

```
x-feature-flags: {...}
```

This allows:

- extremely fast flag evaluation
- global rollout control
- region-based flags

Edge caching TTL example:

```
30 seconds
```

---

### 3. Backend Flag Evaluation

Backend services must evaluate flags using context.

Context includes:

```
userId
tenantId
region
role
subscription plan
```

Evaluation example:

```
isFeatureEnabled("NEW_DASHBOARD", {
  userId,
  tenantId,
  region
})
```

Evaluation priority:

```
Kill Switch
↓
Tenant Override
↓
Region Rule
↓
User Cohort
↓
Percentage Rollout
↓
Default Flag
```

---

### 4. Frontend Flag Consumption

Frontend must consume flags through hooks.

Example hook:

```
hooks/use-feature-flag.ts
```

Example implementation:

```ts
export function useFeatureFlag(flag: FeatureFlag) {
  const context = useAuth();

  return evaluateFeatureFlag(flag, {
    userId: context.user?.id,
    tenantId: context.tenant?.id,
  });
}
```

Example usage:

```tsx
const showDashboard = useFeatureFlag("NEW_DASHBOARD");
```

Components must not access flags directly.

---

### Server-Side Flags

Flags must also be available in:

- Server Components
- Route Handlers
- Middleware

Example:

```ts
import { getFeatureFlag } from "@/lib/feature-flags/server";

const showFeature = await getFeatureFlag("NEW_DASHBOARD");
```

---

### Edge Middleware Integration

Edge middleware must attach flags to request context.

Example:

```
request.headers.set("x-feature-flags", JSON.stringify(flags))
```

Server code can then read flags from headers.

---

### Cohort-Based Rollouts

Feature flags must support cohorts.

Example:

```
cohorts:
  - beta-testers
  - internal-users
  - enterprise-customers
```

Example evaluation:

```
if user.cohort == "beta-testers"
  enable feature
```

---

### Region-Based Rollouts

Features may roll out by region.

Example:

```
regions: ["us", "eu"]
```

Evaluation:

```
if request.region in allowed regions
  enable feature
```

---

### Percentage Rollouts

Gradual rollout must use deterministic hashing.

Example:

```
rollout: 25
```

Meaning 25% of users see the feature.

Implementation:

```
hash(flag + userId) % 100 < rollout
```

---

### Experiment Flags

Experiments must support multiple variants.

Example:

```
CHECKOUT_EXPERIMENT:
  variants: ["A", "B"]
```

Variant assignment:

```
variant = hash(userId) % numberOfVariants
```

Experiments must emit analytics events.

Example:

```
experiment_exposed
```

Payload:

```
flag
variant
userId
timestamp
```

---

### Kill Switch Flags

Critical features must support kill switches.

Example flags:

```
DISABLE_AI_SYSTEM
DISABLE_PAYMENT_GATEWAY
DISABLE_RECOMMENDATIONS
```

Kill switches override all other rules.

---

### Observability

Feature flag evaluations must optionally emit telemetry.

Example event:

```
feature_flag_exposed
```

Metadata:

```
flag
userId
tenantId
region
variant
timestamp
```

This allows monitoring feature adoption.

---

### Security Rules

Feature flags must never expose internal flags to the client.

Flags must be filtered before sending to the browser.

Internal flags example:

```
INTERNAL_DEBUG_MODE
ADMIN_EXPERIMENT
```

These must remain server-only.

---

### Lifecycle Rules

Each flag must contain metadata:

```
owner
created
type
removal_target
```

Flags must be removed once the rollout completes.

---

### Golden Rule

Feature flags are part of the deployment infrastructure.

Every experimental or staged feature must go through the feature flag control plane.

---

## 13. Anti-Patterns to Avoid

### Fat Components

**Violation:** A component contains business logic, API calls, and complex state management in a single file exceeding 200 lines.

```tsx
// ❌ FORBIDDEN
export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`/products?search=${search}&page=${page}`)
      .then((r) => setProducts(r.data))
      .finally(() => setLoading(false));
  }, [search, page]);

  const handleDelete = async (id: string) => {
    await axios.delete(`/products/${id}`);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // 150 more lines of JSX...
}
```

**Fix:** Extract service → hook → component layers as defined in Section 3.

---

### API Calls Inside JSX / `useEffect`

**Violation:** Calling `fetch` or `axios` directly inside a component.

```tsx
// ❌ FORBIDDEN
function ProductList() {
  useEffect(() => {
    fetch("/api/products").then(...); // Never
  }, []);
}

// ❌ FORBIDDEN
<button onClick={() => axios.delete(`/products/${id}`)}>Delete</button>
```

**Fix:** All HTTP calls go through `features/<name>/services/<name>.service.ts`, consumed via hooks.

---

### Shared Mutable State

**Violation:** Storing data that should be server state (React Query) in a Zustand store, then mutating it directly.

```typescript
// ❌ FORBIDDEN
const useProductStore = create((set) => ({
  products: [],
  addProduct: (p) => set((s) => ({ products: [...s.products, p] })),
  removeProduct: (id) =>
    set((s) => ({ products: s.products.filter((p) => p.id !== id) })),
}));
```

**Fix:** Use TanStack Query for all server data. Zustand is for UI state only.

---

### Circular Dependencies

**Violation:** Feature A imports from Feature B, and Feature B imports from Feature A.

```typescript
// ❌ FORBIDDEN
// features/sales/hooks/use-sales.ts
import { useProducts } from "@/features/products/hooks/use-products";

// features/products/hooks/use-products.ts
import { useSales } from "@/features/sales/hooks/use-sales";
```

**Fix:** Extract shared logic to `hooks/` (shared) or `lib/`. Pass data as props from a parent that composes both features.

---

### Overusing Global State

**Violation:** Creating Zustand stores for state that is local to a single component or page.

```typescript
// ❌ FORBIDDEN — this belongs in useState
const useModalStore = create((set) => ({
  isDeleteModalOpen: false,
  openDeleteModal: () => set({ isDeleteModalOpen: true }),
  closeDeleteModal: () => set({ isDeleteModalOpen: false }),
}));
```

**Fix:** Use `useState` for component-local UI state. Only escalate to Zustand when the state is genuinely needed across unrelated parts of the application.

---

### Prop Drilling Beyond 2 Levels

**Violation:** Passing a prop through 3+ component levels where intermediate components do not use it.

```tsx
// ❌ BAD — tenantId drilled through 3 levels
<ProductsPage tenantId={tenantId}>
  <ProductTable tenantId={tenantId}>
    <ProductRow tenantId={tenantId} />
  </ProductTable>
</ProductsPage>
```

**Fix:** Read tenant context from the auth store inside the component that needs it, or use React Context for subtree-scoped values.

---

### Importing Across Feature Boundaries

**Violation:** Importing from another feature's internal files (not its `index.ts`).

```typescript
// ❌ FORBIDDEN — bypasses the public API
import { productService } from "@/features/products/services/product.service";
import { useProductForm } from "@/features/products/hooks/use-product-form";
```

**Fix:** Only import from a feature's `index.ts`. If you need something that is not exported, either add it to the feature's public API or extract it to a shared module.

---

### `any` Type Usage

**Violation:** Using `any` to bypass TypeScript.

```typescript
// ❌ FORBIDDEN
const handleResponse = (data: any) => { ... };
```

**Fix:** Define explicit interfaces in `types.ts`. Use `unknown` with type guards when the shape is genuinely unknown.

---

## 14. Scalability Guidelines

### Phase 1 — Small Team (1–5 developers, 1–5 features)

The structure described in this document is sufficient. All features live flat under `features/`. Shared code lives in `components/`, `hooks/`, `lib/`, `utils/`.

```
features/
├── auth/
├── products/
└── sales/
```

### Phase 2 — Growing Team (5–15 developers, 5–15 features)

Introduce **domain grouping** inside `features/` when features cluster around business domains:

```
features/
├── catalog/           # Domain: product catalog
│   ├── products/
│   ├── categories/
│   └── inventory/
├── commerce/          # Domain: transactions
│   ├── sales/
│   ├── orders/
│   └── payments/
└── operations/        # Domain: back-office
    ├── vendors/
    ├── transfers/
    └── locations/
```

Rules remain the same — features within a domain still must not import from each other directly. Shared domain logic goes into a `{domain}/shared/` folder.

### Phase 3 — Enterprise (15+ developers, 15+ features)

Introduce **Clean Architecture layers** inside each domain:

```
features/catalog/
├── application/       # Use cases: orchestration, no framework
│   ├── use-cases/
│   └── ports/         # Interfaces that infrastructure implements
├── domain/            # Pure business logic: entities, value objects
│   ├── entities/
│   └── rules/
├── infrastructure/    # Framework-specific: React Query, Axios, Zustand
│   ├── api/
│   └── stores/
└── presentation/      # React components and hooks
    ├── components/
    └── hooks/
```

**When to introduce this:** Only when:

1. Business logic is complex enough to warrant unit testing without React (domain layer).
2. You need to swap infrastructure (e.g., replace Axios with a GraphQL client) without touching business logic.
3. Multiple teams own different parts of the same domain.

Do not introduce this prematurely. The Phase 1/2 structure handles most production applications at scale.

### Feature Flag Integration

Base feature flag governance is defined in **Section 10**. The centralized control plane (dashboard, edge, multi-tenant) is defined in **Section 12**. When features need to be toggled per tenant or fetched from an API (Phase 2), add a `flags/` module:

```
features/
└── flags/
    ├── flag-store.ts          # Zustand store for resolved flags
    ├── use-feature-flag.ts    # Hook: useFeatureFlag("new-checkout")
    └── flags.service.ts       # Fetches flags from API on app init
```

Components gate features via the hook, never via environment variables directly:

```tsx
// ✅ GOOD
const isNewCheckoutEnabled = useFeatureFlag("new-checkout");
if (!isNewCheckoutEnabled) return <LegacyCheckout />;
return <NewCheckout />;
```

### Performance Scaling

As the application grows:

1. **Bundle splitting**: Each feature's `index.ts` is a natural code-split boundary. Use `dynamic()` from Next.js for heavy feature pages.
2. **Virtualization**: Use `@tanstack/react-virtual` for any list exceeding 100 items.
3. **Query deduplication**: TanStack Query deduplicates identical queries automatically — lean on this rather than lifting state.
4. **Selective hydration**: Use `<Suspense>` boundaries at the feature level to stream in content progressively.

```tsx
// ✅ GOOD — feature-level code splitting
const ProductsPage = dynamic(
  () =>
    import("@/features/products").then((m) => ({ default: m.ProductsPage })),
  { loading: () => <PageSkeleton /> },
);
```

---

## Enforcement Checklist (Code Review)

Before approving any PR touching `apps/web/`, verify:

- [ ] New feature code lives inside `features/<name>/` with the correct sub-structure
- [ ] No component calls `axios`, `fetch`, or any service function directly
- [ ] No cross-feature imports (only via `index.ts` public API)
- [ ] All HTTP calls go through `features/<name>/services/<name>.service.ts`
- [ ] All server/async state uses TanStack Query — not Zustand, not `useState`
- [ ] New Zustand stores are for UI state only, typed, and export named selectors
- [ ] `"use client"` is only added when strictly required
- [ ] New shared components/hooks are in `components/` or `hooks/` only if used by 2+ features
- [ ] All new files follow the naming conventions in Section 7
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Tests exist for the service and hook layers of new features
- [ ] Experimental features are protected by feature flags (Section 10) or the control plane (Section 12) when implemented
- [ ] Feature flags are defined in `constants/feature-flags.ts` — not scattered
- [ ] Tests cover both flag states (enabled and disabled) when a feature flag is used

---

## Rule: idempotency

_POST/PUT must accept idempotency keys; mutations must be retry-safe_

## Idempotency Rule

Network retries and user double-clicks can cause duplicate mutations. Design for idempotency.

## When Idempotency Matters

- **POST** — Creating resources (sale, order, payment)
- **PUT/PATCH** — Updating resources
- **DELETE** — Deleting (idempotent if "delete" twice = same outcome)

## Idempotency Key Pattern

1. Client sends `Idempotency-Key: <uuid>` header on POST/PUT
2. Server stores key + response in cache (e.g. Redis) with TTL
3. On duplicate request with same key, return cached response (200/201) without re-executing
4. TTL: 24 hours typical for payments; shorter for simpler mutations

## Retry-Safe Design

1. **Use transactions** — Multi-step mutations in a single transaction
2. **Unique constraints** — Rely on DB unique constraints; handle P2002 as conflict
3. **Check-before-insert** — "Create if not exists" patterns
4. **Upsert** — Prefer `upsert` when semantics allow

## Golden Rule

**Duplicate requests should not create duplicate side effects.**

---

## Rule: input-sanitization

_All input validated via Zod; no raw req.body/req.query/req.params_

## Input Sanitization Rule

Never trust client input. Validate everything.

## Required

1. **Zod validation** — All `req.body`, `req.query`, `req.params` must be parsed through Zod schemas
2. **Parse at controller boundary** — `Schema.parse()` or `Schema.safeParse()` before passing to service
3. **No raw access** — Never use `req.body.name` without prior validation

## Pattern

```typescript
// In controller
const body = CreateSchema.parse(req.body);
const result = await service.create(tenantId, body);
```

## Schemas Location

- Per-module: `*.schema.ts`
- Export `Schema` and `z.infer<typeof Schema>` type

## Validation Scope

- **Body** — POST, PUT, PATCH
- **Query** — GET params (page, limit, search, filters)
- **Params** — Dynamic route segments (`:id`)

## Golden Rule

**If it comes from the client, validate it with Zod.**

---

## Rule: library-first-architecture

_>_

## Library-First Architecture Rule

**Custom utilities are the last resort, not the default choice.**

---

## 1. Philosophy

### Why Reinventing Utilities Creates Tech Debt

Custom helpers duplicate what libraries already solve. Each new utility:

- Adds surface area to maintain
- Buries bugs that library maintainers have already fixed
- Diverges from community conventions
- Becomes orphaned when the original author leaves

### Why Custom Helpers Become Unmaintained

In-house utilities lack:

- Dedicated maintainers
- Security advisories
- Ecosystem momentum
- Peer review from thousands of users

They silently drift into legacy code. No one volunteers to refactor them.

### Why Libraries Are Tested, Optimized, and Secure

Mature libraries (zod, date-fns, axios, react-hook-form):

- Handle edge cases you have not imagined
- Are optimized for performance and bundle size
- Receive CVE fixes and security patches
- Are battle-tested across thousands of production apps

### Why Consistency Improves Onboarding and Scaling

When new developers join, they expect:

- `zod` for validation — not `utils/validate.ts`
- `date-fns` for dates — not `utils/date.ts`
- `clsx` + `tailwind-merge` for class names — not `utils/cn.ts`

A predictable stack reduces cognitive load. Hiring becomes easier when the stack aligns with industry standards.

---

**We prefer installing a mature library over writing custom utility code.**

---

## 2. Strict Rule

### Non-Negotiable

- **Do NOT** create custom utility functions if a stable, widely adopted library exists.
- **Do NOT** duplicate functionality already available in ecosystem tools.
- **Every new utility** must justify in the PR description why a library cannot be used.

### Enforcement

PRs that introduce new utilities without justification will be rejected. The burden of proof lies with the author.

---

## 3. Approved Libraries (Frontend)

Use these for common tasks. Do not create custom alternatives.

| Task                  | Approved Library          | Notes                                                                                                               |
| --------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Validation**        | `zod`                     | Single source of truth for schemas. Share with backend when possible.                                               |
| **Forms**             | `react-hook-form`         | With `@hookform/resolvers/zod` for Zod integration.                                                                 |
| **API Calls**         | `axios`                   | Use shared instance from `lib/axios.ts`. Native `fetch` wrapper only if justified (e.g., edge runtime constraints). |
| **Server State**      | `@tanstack/react-query`   | All async server data. No custom cache layer.                                                                       |
| **Date Handling**     | `date-fns`                | No custom `formatDate`, `addDays`, `isBefore`, etc.                                                                 |
| **Class Merging**     | `clsx` + `tailwind-merge` | Use the shared `cn()` utility that composes both.                                                                   |
| **Schema Validation** | `zod`                     | Shared frontend/backend when possible.                                                                              |
| **Debouncing**        | `use-debounce`            | Do not implement custom debounce or throttle.                                                                       |

---

## 4. Approved Libraries (Backend / API Layer)

| Task                       | Approved Library    | Notes                                                                    |
| -------------------------- | ------------------- | ------------------------------------------------------------------------ |
| **Validation**             | `zod`               | All request bodies, query params, env vars.                              |
| **HTTP Client**            | `axios`             | Outbound API calls. No custom wrapper framework.                         |
| **Environment Validation** | `zod` + `dotenv`    | Validate env at startup. Fail fast on missing/invalid vars.              |
| **Rate Limiting**          | Existing middleware | Use `express-rate-limit` or equivalent. Do not roll custom rate limiter. |

### Never Create

- Custom validation framework
- Custom HTTP wrapper framework
- Custom date formatter library
- Custom state manager

---

## 5. When Custom Utils ARE Allowed

Custom utilities are allowed **only** if:

1. **Logic is domain-specific** — maps directly to your business rules.
2. **No mature library exists** — you have searched npm/GitHub and confirmed no suitable package.
3. **Tightly coupled to business logic** — cannot be cleanly extracted.
4. **Cannot be composed from existing packages** — no combination of libraries solves it.

### Examples of Allowed Custom Utils

```typescript
// Domain-specific transform — no library does "workout scoring"
export function calculateExerciseScore(reps: number, weight: number, targetRPE: number): number { ... }

// Maps API shape to domain model — project-specific contract
export function mapApiResponseToDomainModel(raw: ApiResponse): Workout { ... }

// Business rule — tightly coupled to product logic
export function transformWorkoutData(workout: RawWorkout, userPrefs: UserPrefs): TransformedWorkout { ... }
```

### Examples of Forbidden Custom Utils

```typescript
// ❌ Use date-fns
function formatDate(d: Date): string { ... }

// ❌ Use zod
function validateEmail(s: string): boolean { ... }

// ❌ Use use-debounce
function useDebounce<T>(value: T, ms: number): T { ... }

// ❌ Use clsx + tailwind-merge
function cn(...classes: string[]): string { ... }

// ❌ Use lodash.clonedeep or structuredClone
function deepClone<T>(obj: T): T { ... }
```

---

## 6. Decision Checklist (Mandatory Before Writing Utility)

Before creating any new utility function, developers **must** answer:

| Question                                      | If answer is "yes" →               |
| --------------------------------------------- | ---------------------------------- |
| Does a stable library already solve this?     | **Use the library.**               |
| Is this logic domain-specific?                | Proceed only if no library exists. |
| Is the performance benefit proven?            | If not, use the library.           |
| Will this utility require future maintenance? | Prefer library — they maintain it. |
| Is this abstraction premature?                | If yes, inline or use library.     |

**If any answer suggests a library is better → use the library.**

---

## 7. Anti-Patterns to Avoid

| Anti-Pattern                            | Approved Alternative                                   |
| --------------------------------------- | ------------------------------------------------------ |
| `utils/date.ts`                         | `date-fns`                                             |
| `utils/fetch.ts` or custom HTTP wrapper | `axios` or native `fetch`                              |
| `utils/validate.ts`                     | `zod`                                                  |
| Custom `debounce` / `throttle`          | `use-debounce` (frontend), `lodash.debounce` (backend) |
| Custom `deepClone`                      | `structuredClone` (built-in) or `lodash.clonedeep`     |
| Custom `cn()` or class merger           | `clsx` + `tailwind-merge`                              |

---

## 8. Scalability & Maintenance Impact

### Fewer Custom Helpers Reduce Cognitive Load

Developers spend less time reading `utils/` and more time on features. Everyone knows `zod` and `date-fns` — no one knows your `utils/legacy-format.ts`.

### Libraries Improve Performance & Security

- zod is optimized for parsing performance
- date-fns is tree-shakeable (no moment.js bloat)
- axios handles retries, interceptors, and edge cases
- Libraries receive security patches; custom code does not

### Codebase Becomes Predictable

New developers can guess where validation lives (`zod`), where dates are formatted (`date-fns`), and where API calls go (`axios` + TanStack Query). No archaeology required.

### Hiring Becomes Easier

"Experience with zod, React Hook Form, TanStack Query" is standard. "Experience with AcmeCorp's custom validation framework" is not.

---

## 9. Enforcement Rule

This rule must be enforced in:

- **Code reviews** — Reject PRs that add utilities without justification.
- **PR checklist** — "Does this PR introduce a new utility? If yes, why can't a library be used?"
- **Architecture audits** — Quarterly review of `utils/` and `lib/` for redundant custom code.

### PR Template Addition

```markdown
## New Utilities (if any)

- [ ] No new utilities added, OR
- [ ] New utility `utils/foo.ts` added because: [justification — no library exists / domain-specific / etc.]
```

---

**Custom utilities are the last resort, not the default choice.**

---

## Rule: never-break-tests

_Enforce all tests pass; no skipping or deleting tests to fix CI_

## Never Break Tests Rule

Tests are the safety net. Do not weaken them to make CI pass.

## Forbidden Actions

1. **Do NOT** use `it.skip`, `test.skip`, `describe.skip` to fix failing tests
2. **Do NOT** delete tests that are failing — fix the code or fix the test
3. **Do NOT** comment out assertions or test bodies
4. **Do NOT** reduce test coverage to avoid flakiness — fix the flakiness instead
5. **Do NOT** lower coverage thresholds in config to pass CI

## Required Actions

1. **Fix the root cause** — If a test fails after a change, fix the code or update the test expectation
2. **Run tests locally** — Ensure tests pass before pushing
3. **Investigate CI failures** — Do not retry CI blindly; understand why tests failed

## When a Test Fails

1. Reproduce locally
2. Determine: Is the test wrong or is the code wrong?
3. If the test is outdated (e.g. API contract changed intentionally), update the test to match the new contract
4. If the code introduced a bug, fix the code

## Golden Rule

**All tests must pass. No exceptions.**

---

## Rule: query-efficiency

_No N+1; use select/include; paginate all list endpoints_

## Query Efficiency Rule

Database queries are often the bottleneck. Optimize proactively.

## N+1 Prevention

- **Use `include`** — Fetch related data in one query
- **Use `select`** — Fetch only needed fields
- **Batch lookups** — Use `findMany` with `where: { id: { in: [...] } }` instead of loop + `findUnique`

## Pagination

- **All list endpoints** must support pagination (`page`, `limit`)
- **Cursor pagination** for large, ordered lists (better performance)
- **Default limits** — Cap max `limit` (e.g. 100) to avoid runaway queries

## Indexes

- Add indexes for `where`, `orderBy`, and `include` foreign keys
- Use `@@index` in Prisma for compound queries

## Anti-Patterns

- `findMany` without `take` on unbounded lists
- Loading full relations when only IDs needed
- Sequential queries in a loop

## Golden Rule

**One query per request when possible. Paginate all lists.**

---

## Rule: safe-refactor

_Step-by-step refactoring checklist with test verification_

## Safe Refactor Rule

Before refactoring any code, follow this checklist to avoid introducing regressions.

## Pre-Refactor Checklist

1. **Run existing tests** — `pnpm test` or `pnpm --filter <app> test -- --run`
2. **Verify tests pass** — All tests must be green before starting
3. **Identify all callers** — Use ripgrep to find every usage of the code being changed
4. **Understand behavior** — Document current behavior and edge cases

## During Refactor

1. **One logical change per commit** — Do not mix refactors with feature changes
2. **Preserve behavior** — No intentional behavior changes; refactor only
3. **Run tests after each step** — Catch regressions early
4. **Update callers** — Fix all identified call sites in the same change

## Post-Refactor Checklist

1. **Run full test suite** — Unit, integration, E2E
2. **Run type checker** — `pnpm check-types` or `tsc --noEmit`
3. **Run linter** — `pnpm lint`
4. **Verify no new `any` or `@ts-ignore`** — Maintain type safety

## Golden Rule

**Never refactor without tests passing before and after.**

---

## Rule: skills-index

_Skills catalog — consult the relevant skill file before working on any matching task_

## Skills Index

This project has 30 skills in `.cursor/skills/`. Before working on any task below, read the corresponding `SKILL.md` file first.

## How to Use

When a task matches a skill's context, read the skill file:

```
Read: .cursor/skills/<skill-name>/SKILL.md
```

Then follow the patterns and guidelines it contains.

---

## Skill Catalog

### Code Quality & Standards

| Trigger Context                                                                                               | Skill File                                    |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Writing any TypeScript/JavaScript code, naming conventions, async patterns, error handling, file organization | `.cursor/skills/coding-standards/SKILL.md`    |
| Before writing a utility function or adding a new npm dependency                                              | `.cursor/skills/search-first/SKILL.md`        |
| Writing a new feature, fixing a bug, refactoring existing code                                                | `.cursor/skills/tdd-workflow/SKILL.md`        |
| Before creating a PR, after completing a feature implementation                                               | `.cursor/skills/verification-loop/SKILL.md`   |
| Finding unused exports, orphaned files, unreachable code                                                      | `.cursor/skills/dead-code-detection/SKILL.md` |
| Circular dependency detection, import graph analysis, coupling                                                | `.cursor/skills/dependency-analysis/SKILL.md` |

### API & Backend

| Trigger Context                                                                                     | Skill File                                           |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Designing new API endpoints, URL structure, HTTP status codes, pagination, error responses          | `.cursor/skills/api-design/SKILL.md`                 |
| Building services, repositories, caching with Redis, database transactions, JWT auth, rate limiting | `.cursor/skills/backend-patterns/SKILL.md`           |
| File upload processing, import/export pipelines, avoiding reprocessing duplicate content            | `.cursor/skills/content-hash-cache-pattern/SKILL.md` |

### Database

| Trigger Context                                                                                      | Skill File                                     |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Prisma schema changes, adding columns/tables/indexes, backfilling data, zero-downtime migrations     | `.cursor/skills/database-migrations/SKILL.md`  |
| Index design, query optimization, data type selection, RLS policies, cursor pagination, slow queries | `.cursor/skills/postgres-patterns/SKILL.md`    |
| Missing indexes, N+1 queries, full table scans, EXPLAIN ANALYZE                                      | `.cursor/skills/slow-query-detection/SKILL.md` |
| pg_dump automation, PITR, backup verification                                                        | `.cursor/skills/database-backup/SKILL.md`      |

### Security

| Trigger Context                                                                | Skill File                                |
| ------------------------------------------------------------------------------ | ----------------------------------------- |
| Auth/authorization changes, new endpoints, pre-PR security check, OWASP review | `.cursor/skills/security-review/SKILL.md` |
| Auditing `.cursor/` config files, checking skills/rules for injection risks    | `.cursor/skills/security-scan/SKILL.md`   |

### Frontend

| Trigger Context                                                                                                   | Skill File                                         |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| React components, custom hooks, Next.js App Router, state management, forms, accessibility                        | `.cursor/skills/frontend-patterns/SKILL.md`        |
| Bundle size analysis, heavy imports, code splitting                                                               | `.cursor/skills/bundle-analysis/SKILL.md`          |
| Feature-flag/feature-lock work (env or plan gating), preventing disabled-feature API calls, CRM subfeature gating | `.cursor/skills/feature-lock-enforcement/SKILL.md` |

### Testing

| Trigger Context                                                                   | Skill File                                       |
| --------------------------------------------------------------------------------- | ------------------------------------------------ |
| Unit, integration, security, concurrency test architecture and patterns           | `.cursor/rules/testing-architecture.mdc`         |
| Integration tests, DB-backed tests, Supertest                                     | `.cursor/skills/integration-testing/SKILL.md`    |
| Security tests (auth-bypass, IDOR, cross-tenant)                                  | `.cursor/skills/security-testing/SKILL.md`       |
| Concurrency/race tests, oversell prevention                                       | `.cursor/skills/concurrency-testing/SKILL.md`    |
| Property-based/fuzz tests, schema invariants                                      | `.cursor/skills/property-based-testing/SKILL.md` |
| Test factories, helpers, DB rollback                                              | `.cursor/skills/test-infrastructure/SKILL.md`    |
| Playwright E2E tests, Page Object Model, critical user flows, CI test integration | `.cursor/skills/e2e-testing/SKILL.md`            |
| LLM/AI feature evaluation, capability evals, regression evals, pass@k metrics     | `.cursor/skills/eval-harness/SKILL.md`           |

### Infrastructure & Deployment

| Trigger Context                                                                  | Skill File                                      |
| -------------------------------------------------------------------------------- | ----------------------------------------------- |
| Dockerfile, docker-compose, container networking, volumes, container security    | `.cursor/skills/docker-patterns/SKILL.md`       |
| CI/CD pipelines, GitHub Actions, rolling/blue-green/canary deployments, rollback | `.cursor/skills/deployment-patterns/SKILL.md`   |
| OpenTelemetry, Prometheus, Grafana, Jaeger integration                           | `.cursor/skills/observability-setup/SKILL.md`   |
| Failure points, missing error handling, unhandled rejections                     | `.cursor/skills/failure-mode-analysis/SKILL.md` |
| Runbooks, rollback procedures, incident communication                            | `.cursor/skills/incident-response/SKILL.md`     |

### AI Agent Workflow

| Trigger Context                                                                            | Skill File                                       |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Exploring unfamiliar code, multi-file tasks, gathering context before implementing         | `.cursor/skills/iterative-retrieval/SKILL.md`    |
| Context window is large, switching from research to implementation, completing a milestone | `.cursor/skills/strategic-compact/SKILL.md`      |
| End of a significant session, extracting reusable patterns to save for future use          | `.cursor/skills/continuous-learning/SKILL.md`    |
| Tracking instincts with confidence scores, `/instinct-status`, `/evolve` commands          | `.cursor/skills/continuous-learning-v2/SKILL.md` |
| Monthly skill audit, reviewing skill quality, retiring outdated skills                     | `.cursor/skills/skill-stocktake/SKILL.md`        |

---

## Quick Reference

```
coding-standards        → any TS/JS code
search-first            → before adding dependencies
tdd-workflow            → new features, bug fixes
verification-loop       → before PR

api-design              → new endpoints
backend-patterns        → services, caching, auth
content-hash-cache      → file processing pipelines

database-migrations     → schema changes
postgres-patterns       → indexes, query optimization

security-review         → auth changes, new endpoints
security-scan           → .cursor/ config audit

frontend-patterns       → React, Next.js, hooks
feature-lock-enforcement → feature flags, silent no-call gating

integration-testing     → API + DB integration tests
security-testing        → auth-bypass, IDOR, cross-tenant
concurrency-testing     → inventory/sale races
property-based-testing  → schema fuzz
test-infrastructure     → factories, helpers, mocks
e2e-testing             → Playwright tests
eval-harness            → LLM feature evals

docker-patterns         → Dockerfile, compose
deployment-patterns     → CI/CD, rollouts
observability-setup     → OpenTelemetry, Prometheus, Grafana
slow-query-detection    → N+1, indexes, EXPLAIN
database-backup         → pg_dump, PITR
dead-code-detection     → unused exports, orphaned files
dependency-analysis     → circular deps, import graph
failure-mode-analysis   → error handling, unhandled rejections
bundle-analysis         → frontend bundle size
incident-response       → runbooks, rollback

iterative-retrieval     → exploring unfamiliar code
strategic-compact       → context management
continuous-learning     → session pattern extraction
continuous-learning-v2  → instinct-based learning
skill-stocktake         → skill quality audit
```

---

## Rule: strict-typing

_Ban any/as any/@ts-ignore; require explicit return types on exports_

## Strict Typing Rule

TypeScript's value is in type safety. Do not bypass it.

## Forbidden

1. **`any`** — Never use `any` as a type
2. **`as any`** — Never cast to any to silence errors
3. **`@ts-ignore`** — Never use; prefer `@ts-expect-error` with a comment explaining why
4. **`@ts-expect-error`** — Use sparingly; add a comment and ticket to fix the root cause
5. **Implicit `any`** — Enable `noImplicitAny`; all parameters and returns must be typed

## Required

1. **Explicit return types** — All exported functions must have explicit return types
2. **Proper typing for unknowns** — Use `unknown` + type guards instead of `any`
3. **Generic constraints** — Use `<T extends SomeType>` when needed
4. **Narrow with Zod** — For runtime-validated data, use `z.infer<typeof Schema>`

## Exceptions (Rare)

- **Third-party typings** — When a library has no types and `@ts-expect-error` is the only option, add a TODO
- **Test mocks** — Prefer `vi.mocked()` and proper mock types over `as any`

## Golden Rule

**If you need `any`, you need to fix the types.**

---

## Rule: structured-logging

_Use pino; JSON format; required fields; sensitive data redaction_

## Structured Logging Rule

Logs must be machine-parseable and safe. Use pino with JSON output.

## Required Fields

Every log entry should include (where available):

- `timestamp` — ISO 8601
- `level` — info, warn, error
- `message` — Human-readable summary
- `requestId` — Correlation ID for the request
- `userId` — When in request context
- `tenantId` — When in tenant context

## Sensitive Data Redaction

Never log:

- Passwords
- Tokens (JWT, API keys)
- `Authorization` header
- Credit card numbers
- PII (without consent/anonymization)

Use pino's `redact` option for automatic redaction.

## Format

- **Development** — Pretty-printed for readability
- **Staging/Production** — JSON lines for log aggregation (ELK, Loki)

## Golden Rule

**Logs are for debugging. Redact secrets. Use structured JSON in production.**

---

## Rule: testing-architecture

_Production-grade testing architecture — unit, integration, security, concurrency, E2E. Apply when writing or modifying tests._

## Testing Architecture

This project follows a production-grade testing pyramid. Every new controller, service, repository, or schema must have corresponding tests. Critical flows must have integration, security, and concurrency coverage.

## Test Pyramid

```
E2E (Playwright)     ← Critical user flows: login, sale, trash
Integration (API)    ← Supertest + DB: auth, sale, trash, plan limits
Unit                 ← Controllers, services, repositories, schemas
```

## Test Locations

| Type            | Location                                                  |
| --------------- | --------------------------------------------------------- |
| **Unit (API)**  | Co-located: `apps/api/src/modules/<name>/*.test.ts`       |
| **Unit (Web)**  | Co-located: `apps/web/features/<name>/**/*.test.{ts,tsx}` |
| **Integration** | `apps/api/tests/integration/api/*.integration.test.ts`    |
| **DB / Tenant** | `apps/api/tests/integration/db/*.test.ts`                 |
| **Security**    | `apps/api/tests/security/*.test.ts`                       |
| **Concurrency** | `apps/api/tests/concurrency/*.test.ts`                    |
| **Failure**     | `apps/api/tests/failure/*.test.ts`                        |
| **Jobs**        | `apps/api/tests/jobs/*.test.ts`                           |
| **Property**    | `apps/api/tests/property/*.test.ts`                       |
| **E2E**         | `apps/web/e2e/*.spec.ts`                                  |

## File Naming

| Convention  | Example                   |
| ----------- | ------------------------- |
| Unit        | `*.test.ts`, `*.test.tsx` |
| Integration | `*.integration.test.ts`   |
| E2E         | `*.spec.ts`               |

## Required Tests Per Module (API)

- **Controller:** `*.controller.test.ts` — happy path, validation errors, not-found, unexpected errors (`sendControllerError`)
- **Schema:** `*.schema.test.ts` — valid input, invalid input, edge cases, normalization
- **Service:** `*.service.test.ts` — business logic, error handling (critical modules: auth, sale, inventory, platform)
- **Repository:** `*.repository.test.ts` — Prisma calls, transaction behavior (critical: inventory, transfer, trash, sale)

## Controller Test Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { mockRes, makeReq } from "@tests/helpers/controller";

vi.mock("./service", () => ({ default: { create: vi.fn(), ... } }));
vi.mock("@/utils/controllerError", () => ({ sendControllerError: vi.fn() }));

import myController from "./my.controller";

describe("MyController", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 201 with created resource on success", async () => {
    const req = makeReq({ body: { name: "Foo" } });
    const res = mockRes() as Response;
    await myController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("calls sendControllerError on unexpected error", async () => {
    mockService.create.mockRejectedValue(new Error("DB down"));
    await myController.create(req, res);
    expect(sendControllerError).toHaveBeenCalled();
  });
});
```

## Repository Test Pattern

Mock Prisma via `vi.mock("@/config/prisma")`. Use `$transaction` callback pattern for multi-step operations. Assert correct `where`/`data` passed to Prisma.

## Required Cross-Cutting Tests

- **IDOR:** User A cannot access User B's resources by changing IDs
- **Cross-tenant:** Tenant A cannot access Tenant B's data
- **Auth bypass:** Unauthenticated requests to protected routes return 401
- **Concurrency:** Inventory/sale/transfer — no oversell, idempotency
- **Trash cleanup job:** `runTrashCleanup()` deletes items older than 30 days

## Quality Requirements

- **Deterministic:** No time-dependent flakiness; mock dates when needed
- **Isolated:** Each test independent; no shared mutable state; `vi.clearAllMocks()` in `beforeEach`
- **Readable:** Clear describe/it names; one assertion focus per test where possible
- **Maintainable:** Factories over inline data; shared helpers in `tests/helpers/`

## Golden Rules

1. Every new controller **must** have `*.controller.test.ts`
2. Every new module **must** have `*.schema.test.ts`
3. Critical flows (auth, sale, trash) **must** have integration and security tests
4. Inventory/sale/transfer **must** have concurrency tests
5. Use `makeReq` and `mockRes` from `@tests/helpers/controller` — never duplicate inline

## Exemplars

- Controller: `apps/api/src/modules/trash/trash.controller.test.ts`
- Repository: `apps/api/src/modules/sales/sale.repository.test.ts`
- Service: `apps/api/src/modules/trash/trash.service.test.ts`
- Shared utils: `apps/api/src/utils/controllerError.test.ts`, `apps/api/src/shared/audit/createDeleteAuditLog.test.ts`
- Factories: `apps/api/tests/factories/`
- Helpers: `apps/api/tests/helpers/controller.ts`, `apps/api/tests/helpers/api.ts`, `apps/api/tests/helpers/db.ts`, `apps/api/tests/helpers/mocks.ts`

---
