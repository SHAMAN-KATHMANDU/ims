# Checkpoint 03 — Phone Input with Country Flags

**Commit:** (fill after commit)
**Status:** DONE
**Tests:** PASS
**Type check:** PASS

## What was done
- Installed country-flag-icons
- Replaced Select with Popover + Command (searchable country list)
- Added FlagIcon component showing country flags next to codes
- Wider container (min-w-[120px] for country button)
- PhoneInput now passes attempted E.164 to form when invalid so schema validation fails
- Added phone validation to vendor schema (refine with parseAndValidatePhone)

## What's next
- Step 1.4: NumericInput component
