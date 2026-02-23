# QA Defect Log

## Critical / High

1. **Platform login rate-limit lockout** (Documented)
   - Severity: High
   - Repro: hit `/system/login` repeatedly during QA, then attempt valid `platform` login.
   - Actual: `Too many requests. Please wait a moment and try again.`
   - Expected: valid credentials should be accepted after reasonable cooldown.
   - Likely cause: strict auth rate limiter policy in API (e.g. express-rate-limit). Mitigation: increase rate-limit window or whitelist login in dev; document for ops.

2. **CRM Deals first-load error toast** (Fixed)
   - Severity: High
   - Repro: open `/ruby/crm/deals` as tenant admin with no pipeline configured.
   - Actual: shows error toast `No pipeline found`.
   - Expected: clean empty state without error-level noise.
   - Likely cause: empty-state API response treated as exception.

## Medium

1. **Hydration warnings on selected routes** (Triaged)
   - Severity: Medium
   - Repro: open `/ruby/sales`, `/ruby/product`, `/ruby/settings/usage`.
   - Actual: hydration mismatch warnings logged.
   - Expected: no hydration mismatch warnings.
   - Likely cause: server/client-rendered value divergence (e.g. date formatting, useIsMobile). Mitigation: replaced useIsMobile with CSS breakpoints in form CTAs to reduce client-only branches.

2. **Unauthorized UX inconsistency across role-restricted routes**
   - Severity: Medium
   - Repro: access platform/superadmin routes with non-platform account.
   - Actual: some paths redirect, others render unauthorized in place.
   - Expected: consistent denial behavior with clear action path.
   - Likely cause: mixed route-level guard patterns.

## Low

1. **Duplicate empty-state messaging in some CRM lists** (Fixed)
   - Severity: Low
   - Repro: open empty contacts/leads/tasks datasets.
   - Actual: table empty message and extra empty-state copy both show.
   - Expected: single clear empty-state message.
   - Fix: DataTablePagination now shows "0 items" instead of "No items" when empty to avoid redundancy with table "No X found" message.

## Completed Fixes In This Recovery

- Fixed drawer duplicate close buttons: SheetContent `showCloseButton` prop; FormSurface passes `false`.
- Standardized mobile create flows: all FormSurface-based forms use CSS `md:hidden`/`hidden md:block` so mobile opens full-page `/new` routes.
- Fixed login page auto-redirect loops by tightening middleware login redirect rules to hydrated user state.
- Made login rendering immediate with slug fallback while workspace name resolves asynchronously with timeout.
- Added callback URL handling after login with path safety guard.
- Stabilized auth hydration by allowing post-hydration `me` fetch without forced global redirect side-effects.
- Standardized unauthorized copy and added explicit platform-route unauthorized redirect in middleware.
- Hardened drawer form surface sizing/scrolling for viewport-safe usage.
