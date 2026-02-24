# API Architecture

## Layered Structure

```
Route → Controller → Service → Repository → Database
```

- **Routes** (`*.router.ts`): Define HTTP endpoints, middleware wiring. No logic, no DB access.
- **Controllers** (`*.controller.ts`): Extract params from `req`, call services, return standardized responses via `ok()`/`fail()`.
- **Services** (`*.service.ts`): Business logic. Framework-independent. No `req`/`res`.
- **Repositories** (`*.repository.ts`): All Prisma/database access. No business rules.

## Response Format

All endpoints return:

```ts
// Success
{ success: true, data?: T, message?: string }

// Error (from errorHandler)
{ success: false, error: string, code?: string }
```

Paginated: `{ success: true, data: { items, pagination }, message? }`

## Error Handling

- Services throw `DomainError`, `NotFoundError`, or `AppError`.
- Controllers rely on `asyncHandler`; errors propagate to global `errorHandler`.
- Prisma errors are mapped via `mapPrismaError`.

## Auth Context

- Use `getAuthContext(req)` in controllers. Returns `{ userId, tenantId, role }`.
- Use `fail(res, "Not authenticated", 401)` when auth is missing.

## Strategy / Handler Maps

For branching on status, role, or action:

- Prefer handler maps over long if/else chains.
- Example: `promoModeHandlers[mode](ctx)` instead of nested conditionals.

## File Size

- Controllers: <300 lines per file.
- Split by concern (e.g. `bulkUpload.service.ts`) when needed.

## Multi-Tenant

- Include `tenantId` in all repository `where` clauses.
- Use tenant-scoped Prisma from `@/config/prisma`.

## Constants

- Use `AuditResource` and `AuditAction` from `@/shared/types` for audit log resource/action strings (e.g. `AuditAction.CREATE_PRODUCT`, `AuditResource.PRODUCT`) instead of magic strings.

## Shared Services

- **`services/productService.ts`**: Shared orchestration for product create/update. Used by `modules/products/products.service` (resolveCategory, resolveDiscounts, createProductWithInventory) and `product.update.controller` (upsertVariations). Kept as a single place for category/discount resolution, product+inventory creation, and variation upsert; uses Prisma directly.
