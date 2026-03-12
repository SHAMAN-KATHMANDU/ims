# Checkpoint 02 — Per-Step Validation

**Commit:** (will be filled after commit)
**Status:** DONE
**Tests:** PASS
**Type check:** PASS

## What was done
- Modified handleNext() in ProductForm to validate current tab before advancing
- General tab: validates name, categoryId, imsCode, costPrice, mrp
- Dimensions tab: validates length, breadth, height, weight are valid numbers if provided
- Variations tab: validates variations and stock quantities
- Shows error dialog and blocks advancement on validation failure

## What's next
- Step 1.3: Phone input with country flags
