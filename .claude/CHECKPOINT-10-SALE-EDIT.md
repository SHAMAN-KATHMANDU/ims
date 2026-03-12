# Checkpoint 10 — Sale Edit with Branching (Step 4.2)

**Completed:** 2025-03-12

## Summary

Implemented sale edit as revision branching. Editing a sale creates a new revision linked to the original; inventory is restored on the parent, then deducted for the new sale.

## API Changes

### Prisma

- Migration `add-sale-edit-branching`: Added to Sale:
  - `parentSaleId`, `parentSale` / `revisions` self-relation
  - `revisionNo` (default 1), `isLatest` (default true)
  - `editReason`, `editedById`, `editedAt`, `editedBy` relation

### sale.repository.ts

- `createSaleRevision(input)` — in transaction:
  1. Reverse parent inventory + promo usage
  2. Mark parent `isLatest = false`
  3. Create new sale with `parentSaleId`, `revisionNo`, `editedById`, `editedAt`, `editReason`
  4. Increment promo usage for new codes
  5. Deduct inventory for new items
- List filters: added `isLatest: true` so only current revisions appear in lists
- `findSalesPaginatedForUserSince`, `countSalesForUserSince`: include `isLatest: true`

### sale.service.ts

- `editSale(saleId, userId, dto)` — validates sale is latest/not deleted, calculates items, calls `createSaleRevision`
- Added `editSale` to `SaleService` class

### sale.controller.ts

- `editSale` handler — parses `EditSaleSchema`, returns 200 with new sale

### sale.schema.ts

- `EditSaleSchema` — `items`, `notes`, `payments`, `editReason`

### sale.router.ts

- `POST /sales/:id/edit` — body: items, notes?, payments?, editReason?

## Frontend Changes

### sales.service.ts

- `editSale(saleId, data)` — `POST /sales/:id/edit`
- `EditSaleData` interface

### use-sales.ts

- `useEditSale()` — mutation, invalidates lists, detail, analytics, inventory, products

### EditSaleForm.tsx (new)

- Pre-filled form with sale items
- Editable quantity, remove item, add by IMS code
- Notes, edit reason
- Submit calls editSale

### SaleDetail.tsx

- Edit button (hidden when `isLatest === false`)
- Edit dialog with EditSaleForm

### types.ts

- Sale: `parentSaleId`, `revisionNo`, `isLatest`
- SaleItem: `subVariationId`

## Tests

- sale.controller.test.ts: `editSale` — 200 on success, 400 on validation, sendControllerError on unexpected error
