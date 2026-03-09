# API Architecture

## Overview

This project is a **pnpm Turborepo monorepo** with a multi-tenant SaaS Express API.

```
projectX/
├── apps/
│   ├── api/          ← Express + TypeScript + Prisma + PostgreSQL
│   └── web/          ← Next.js + Tailwind CSS
├── packages/
│   ├── shared/       ← Shared types and utilities
│   ├── ui/           ← Shared UI components
│   ├── eslint-config/
│   └── typescript-config/
└── deploy/           ← Docker Compose + Nginx configs
```

---

## Module Structure

Every module under `apps/api/src/modules/<name>/` has exactly 5 files:

```
modules/<name>/
  <name>.repository.ts   ← ONLY file that imports prisma
  <name>.service.ts      ← business logic only, no req/res
  <name>.controller.ts   ← thin HTTP layer
  <name>.schema.ts       ← Zod validation schemas
  <name>.schema.test.ts  ← unit tests for schemas
```

### Layer Responsibilities

| Layer          | Responsibility                       | Must NOT                     |
| -------------- | ------------------------------------ | ---------------------------- |
| **Repository** | All Prisma queries                   | Contain business logic       |
| **Service**    | Business logic, orchestration        | Import prisma, use req/res   |
| **Controller** | HTTP: parse → call service → respond | Import prisma, contain logic |
| **Schema**     | Zod validation types                 | Contain logic                |

---

## Request Flow

```
HTTP Request
    │
    ▼
Router (*.router.ts)
    │
    ▼
Middleware chain:
  verifyToken        ← validates JWT, sets req.user
  resolveTenant      ← resolves tenant from subdomain/header
  checkSubscription  ← enforces plan limits
  requireAuth        ← sets req.authContext (tenantId, userId, role)
    │
    ▼
Controller (*.controller.ts)
  getAuthContext(req) → { tenantId, userId, role }
  Schema.parse(req.body) → validated DTO
  service.method(tenantId, dto) → result
  ok(res, result) or fail(res, message, status)
    │
    ▼
Service (*.service.ts)
  Business rules, validation, orchestration
  repository.method(args) → data
    │
    ▼
Repository (*.repository.ts)
  prisma.model.operation(args) → Prisma result
```

---

## Standardized API Response Format

All endpoints return one of two shapes:

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, message: string }
```

### Response Helpers (`shared/response/index.ts`)

```typescript
import { ok, fail } from "@/shared/response";

// Success responses
return ok(res, { category }); // 200
return ok(res, { category }, 201); // 201 Created
return ok(res, { items, pagination }); // 200 with pagination

// Error responses
return fail(res, "Category not found", 404);
return fail(res, "Name is required", 400);
return fail(res, "Unauthorized", 401);
```

### TypeScript Type

```typescript
import { ApiResponse } from "@/shared/response";

// Use as return type annotation
type CreateCategoryResponse = ApiResponse<{ category: Category }>;
```

---

## Auth Context

The `requireAuth` middleware sets `req.authContext` once. All controllers read from it via `getAuthContext()`.

```typescript
// shared/auth/getAuthContext.ts
export function getAuthContext(req: Request): AuthContext {
  if (!req.authContext) throw new AppError("Unauthorized", 401);
  return req.authContext;
}

// AuthContext shape
interface AuthContext {
  tenantId: string;
  userId: string;
  role: "superAdmin" | "admin" | "user";
}
```

**Never access `req.user!` directly in controllers.** Always use `getAuthContext(req)`.

```typescript
// ✅ GOOD
const { tenantId, userId, role } = getAuthContext(req);

// ❌ BAD
const tenantId = req.user!.tenantId;
const userId = (req as any).user.id;
```

---

## Error Handling

### Hierarchy

```
AppError (known business errors)
  └── NotFoundError (404 shorthand)

mapPrismaError() (maps Prisma codes to HTTP)
  P2025 → 404 Not Found
  P2002 → 409 Conflict
  P2003 → 400 Bad Request

sendControllerError() (catch-all for controllers)
  → maps Prisma errors first
  → logs unknown errors
  → returns generic 500
```

### Controller catch block pattern

```typescript
} catch (error) {
  if (error instanceof AppError) {
    return fail(res, error.message, error.statusCode);
  }
  return sendControllerError(req, res, error, "methodName");
}
```

### Throwing from services

```typescript
// In service layer
throw new AppError("Category already exists", 409);
throw new NotFoundError("Category");
throw new AppError("Insufficient permissions", 403);
```

---

## Zod Validation

Schemas live in `*.schema.ts` and are used in controllers before calling the service.

```typescript
// category.schema.ts
import { z } from "zod";

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;
```

```typescript
// In controller — parse throws ZodError on invalid input
const body = CreateCategorySchema.parse(req.body);
// or use safeParse for custom error handling
const result = CreateCategorySchema.safeParse(req.body);
if (!result.success) return fail(res, result.error.message, 400);
```

---

## Shared Directory (`apps/api/src/shared/`)

```
shared/
  auth/
    getAuthContext.ts    ← single source of auth truth
  errors/
    index.ts             ← AppError, NotFoundError, mapPrismaError, sendControllerError
  response/
    index.ts             ← ok(), fail(), ApiResponse<T>
  types/
    index.ts             ← AuthContext, AuditAction, AuditResource enums
```

### Import paths (using `@/` alias → `apps/api/src/`)

```typescript
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { AppError, NotFoundError, sendControllerError } from "@/shared/errors";
import { ok, fail, ApiResponse } from "@/shared/response";
import { AuthContext, AuditAction, AuditResource } from "@/shared/types";
```

---

## Complete Module Example

### `category.schema.ts`

```typescript
import { z } from "zod";

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});
export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
```

### `category.repository.ts`

```typescript
import prisma from "@/config/prisma";
import { CreateCategoryDto } from "./category.schema";

export class CategoryRepository {
  async findAllByTenant(tenantId: string) {
    return prisma.category.findMany({ where: { tenantId } });
  }

  async findByName(tenantId: string, name: string) {
    return prisma.category.findFirst({ where: { tenantId, name } });
  }

  async create(tenantId: string, data: CreateCategoryDto) {
    return prisma.category.create({ data: { tenantId, ...data } });
  }
}
```

### `category.service.ts`

```typescript
import { AppError } from "@/shared/errors";
import { CategoryRepository } from "./category.repository";
import { CreateCategoryDto } from "./category.schema";

export class CategoryService {
  constructor(private repo: CategoryRepository) {}

  async create(tenantId: string, data: CreateCategoryDto) {
    const existing = await this.repo.findByName(tenantId, data.name);
    if (existing)
      throw new AppError("Category with this name already exists", 409);
    return this.repo.create(tenantId, data);
  }

  async findAll(tenantId: string) {
    return this.repo.findAllByTenant(tenantId);
  }
}
```

### `category.controller.ts`

```typescript
import { Request, Response } from "express";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { ok, fail } from "@/shared/response";
import { sendControllerError } from "@/shared/errors";
import { AppError } from "@/shared/errors";
import { CreateCategorySchema } from "./category.schema";
import { CategoryService } from "./category.service";

export class CategoryController {
  constructor(private service: CategoryService) {}

  async createCategory(req: Request, res: Response) {
    try {
      const { tenantId } = getAuthContext(req);
      const body = CreateCategorySchema.parse(req.body);
      const category = await this.service.create(tenantId, body);
      return ok(res, { category }, 201);
    } catch (error) {
      if (error instanceof AppError)
        return fail(res, error.message, error.statusCode);
      return sendControllerError(req, res, error, "createCategory");
    }
  }

  async getCategories(req: Request, res: Response) {
    try {
      const { tenantId } = getAuthContext(req);
      const categories = await this.service.findAll(tenantId);
      return ok(res, { categories });
    } catch (error) {
      return sendControllerError(req, res, error, "getCategories");
    }
  }
}
```

---

## Migration from Fat Controllers

The current codebase has fat controllers (Prisma + logic + `res.json()` + `req.user!`). When refactoring a module:

1. **Create `*.schema.ts`** — extract Zod schemas from inline validation
2. **Create `*.repository.ts`** — move all `prisma.*` calls out of the controller
3. **Create `*.service.ts`** — move business logic (existence checks, calculations) out of the controller
4. **Refactor `*.controller.ts`** — replace `req.user!` with `getAuthContext()`, replace `res.status().json()` with `ok()`/`fail()`
5. **Create `*.schema.test.ts`** — add unit tests for the Zod schemas

### Before (fat controller)

```typescript
async createCategory(req: Request, res: Response) {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Category name is required" });
    const tenantId = req.user!.tenantId;
    const existing = await prisma.category.findFirst({ where: { tenantId, name } });
    if (existing) return res.status(409).json({ message: "Already exists" });
    const category = await prisma.category.create({ data: { tenantId, name, description } });
    res.status(201).json({ message: "Category created successfully", category });
  } catch (error) {
    sendControllerError(req, res, error, "createCategory");
  }
}
```

### After (3-layer)

```typescript
// Controller
async createCategory(req: Request, res: Response) {
  try {
    const { tenantId } = getAuthContext(req);
    const body = CreateCategorySchema.parse(req.body);
    const category = await this.service.create(tenantId, body);
    return ok(res, { category }, 201);
  } catch (error) {
    if (error instanceof AppError) return fail(res, error.message, error.statusCode);
    return sendControllerError(req, res, error, "createCategory");
  }
}
```
