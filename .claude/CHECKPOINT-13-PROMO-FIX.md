# Checkpoint 13 — Promo Code Search Fix

**Status:** DONE
**Tests:** PASS
**Type check:** PASS

## What was done

- **sale.repository.ts:** `findPromoByCode` and `findPromoByCodeWithProducts` use case-insensitive `code` match (`mode: "insensitive"`), `deletedAt: null`, and `isActive: true`
- **promo.repository.ts:** `findFirstByCode` case-insensitive for duplicate check; added `findActiveByCode` for by-code lookup (active, not deleted)
- **promo.service.ts:** `findByCode` uses `findActiveByCode` (active promos only)
- **API:** New endpoint `GET /promos/by-code/:code` — case-insensitive exact match, tenant-scoped, active only
- **Frontend promo.service:** `searchPromoByCode` now calls `/promos/by-code/:code` instead of list with search

## What's next

- Phase 5: CRM Enterprise Upgrade (Step 5.1 — Auto-create Member + Contact from Sales)
