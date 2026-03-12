# Checkpoint 01 — Unsaved Changes Guard

**Commit:** 3abbc25
**Status:** DONE
**Tests:** PASS (web 110, api 1108)
**Type check:** PASS

## What was done
- Added `allowDismiss` prop (default `false`) to `DialogContent` and `SheetContent`
- When `allowDismiss` is false, `onInteractOutside` and `onEscapeKeyDown` call `preventDefault()` to block closing
- Added `allowDismiss` to CommandDialog (command palette) and sidebar mobile Sheet
- All form dialogs/sheets now protected by default

## What's next
- Step 1.2: Per-step validation on ProductForm handleNext()

## Known issues
- None
