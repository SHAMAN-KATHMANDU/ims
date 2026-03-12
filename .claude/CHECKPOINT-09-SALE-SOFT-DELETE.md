# Checkpoint 09 — Sale Soft Delete (Step 4.1)

**Completed:** 2025-03-12

## Summary

Implemented sale soft delete with inventory restoration and promo usage decrement.

## API Changes

### Prisma

- Migration `add-sale-soft-delete`: `Sale` model already had `deletedAt`, `deletedById`, `deleteReason`; migration applied.

### sale.repository.ts

- `NOT_DELETED = { deletedAt: null }` applied to all sale queries
- `softDeleteSale(saleId, deletedById, deleteReason)` — in a transaction:
  - Restores `LocationInventory` and `ProductVariation` stock
  - Decrements promo usage for codes in `promoCodesUsed`
  - Updates sale with `deletedAt`, `deletedById`, `deleteReason`
- `findSaleById` / `findSaleWithPaymentsOnly` use `findFirst` + `NOT_DELETED`

### sale.service.ts

- `deleteSale(saleId, userId, deleteReason?)` — calls `softDeleteSale`, throws 404 when not found
- Added `deleteSale` to `SaleService` class

### sale.controller.ts

- `deleteSale` handler — parses optional `DeleteSaleSchema` body, returns 200 with deleted sale

### sale.schema.ts

- `DeleteSaleSchema` — `{ deleteReason?: string | null }`

### sale.router.ts

- `DELETE /sales/:id` — optional JSON body with `deleteReason`

## Frontend Changes

### sales.service.ts

- `deleteSale(saleId, deleteReason?)` — `DELETE /sales/:id` with optional body

### use-sales.ts

- `useDeleteSale()` — mutation, invalidates lists, detail, analytics, inventory, products

### SaleDetail.tsx

- Delete button (destructive styling)
- `DeleteConfirmDialog` with custom title/description and optional reason field
- On success: toast, close dialog

## Tests

- sale.controller.test.ts: `deleteSale` — 200 on success, passes deleteReason, 404 when not found, sendControllerError on unexpected error
