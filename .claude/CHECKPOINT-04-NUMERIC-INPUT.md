# Checkpoint 04 — Numeric Input Component

**Commit:** (pending)
**Status:** DONE
**Tests:** PASS
**Type check:** PASS

## What was done
- Created `apps/web/components/ui/numeric-input.tsx` — wraps Input with inputMode="decimal", strips non-numeric on input, blur validation
- Replaced type="number" with NumericInput in GeneralTab (costPrice, mrp), DimensionsTab (length, breadth, height, weight), VariationsTab (stock)
- Fixed TS2532 "Object is possibly undefined" in stripNonNumeric

## What's next
- Step 2.1: Password Reset Request System
