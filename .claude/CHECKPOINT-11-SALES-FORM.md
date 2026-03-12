# Checkpoint 11 — Sales Form Fixes (Step 4.3)

**Completed:** 2025-03-12

## Summary

Fixed multiple sales form issues in NewSaleForm.

## Changes

### 1. Search-only products (14.4c)

- Removed pre-loaded inventory on location change
- Fetch inventory only when user types in search (debounced 300ms)
- Empty state: "Search for products by name, IMS code (barcode), or category..."
- Barcode scan (Enter on IMS code) still works
- `getLocationInventory(locationId, { search, limit: 30 })` called only when `debouncedProductSearch.trim()` is non-empty

### 2. Lock showroom (14.4f)

- Disable showroom Select when `items.length > 0`
- Lock icon shown when disabled
- "Clear cart to change showroom" helper text
- Clicking disabled select opens AlertDialog: "Clear cart to change showroom?"
- On confirm: clears cart; user can then change showroom

### 3. Payment mismatch fix (14.4h)

- Validation error only shown when `!isCreditSale && payments.length > 0 && mismatch`
- No "Payment mismatch" when no payments added yet (only when they've added payments that don't match)

### 4. Currency display (14.4i)

- `formatCurrency` in `lib/format.ts`: added `currencyDisplay: "code"` for explicit "NPR" prefix
- All monetary displays (remaining, total, subtotal) now show NPR via formatCurrency

### 5. Credit + full payment (14.4o)

- When `isCreditSale` is checked but payments equal total, auto-uncheck credit
- Toast: "Full payment detected — Credit sale unchecked"
- Effect runs after totalPayment/expectedTotal are computed

### 6. Clean up header (14.1)

- Removed redundant DialogDescription
- Simplified to "New Sale" title only (inline and dialog)
- Removed "Record a sale from a showroom..." subtitle

### 7. Credit checkbox CSS (14.4b)

- Fixed opacity: `opacity-100`, `data-[state=checked]:opacity-100`, `data-[disabled]:opacity-50`
- Checked state: `data-[state=checked]:bg-primary data-[state=checked]:border-primary`
