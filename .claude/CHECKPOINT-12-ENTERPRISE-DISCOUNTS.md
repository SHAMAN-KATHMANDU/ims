# Checkpoint 12 — Enterprise Discount in Sales

**Status:** DONE
**Tests:** PASS
**Type check:** PASS

## What was done

- **Schema:** Added `manualDiscountPercent`, `manualDiscountAmount`, `discountApprovedById`, `discountReason` to SaleItem; User relation `saleItemsApprovedForDiscount`
- **Migration:** `20260312165022_add_manual_sale_discounts`
- **API:**
  - `SALE_ITEM_SCHEMA` extended with manual discount fields; refine: either % or amount, reason required when manual used
  - `calculateSaleItems` accepts optional `opts: { userId, userRole }`; manual discount overrides product discount; auth threshold 20% (requires admin/superAdmin/platformAdmin)
  - `createSale` and `editSale` pass manual discount through to repository
  - Repository persists new SaleItem fields
- **Frontend:**
  - `CreateSaleItem` type and `NewSaleForm` SaleItem extended
  - Manual discount inputs per line: % or amount, reason (required), Clear button
  - Preview and submit pass manual discount; validation blocks submit without reason
  - `getItemDiscountDisplay` includes manual discount

## What's next

- Step 4.5: Fix promo code search (case sensitivity, active status, tenant scoping)
