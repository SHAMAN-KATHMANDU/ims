# Checkpoint 06 — Error Reports Platform-Admin-Only

**Commit:** (pending)
**Status:** DONE
**Tests:** PASS
**Type check:** PASS

## What was done
- ErrorReportsPage: hide status Select for non-platformAdmin; show "—" in Actions column
- error-report.controller: add role check in updateStatus — return 403 if not platformAdmin

## What's next
- Step 3.1: Frontend plan gating audit
