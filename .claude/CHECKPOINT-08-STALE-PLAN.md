# Checkpoint 08 — Fix Stale Plan Data (Step 3.2)

**Status:** DONE
**Tests:** PASS
**Type check:** PASS

## What was done

- **auth-store.ts:** Added `refreshTenant()` that fetches `/auth/me` and updates tenant (and user) in the store.
- **lib/auth-api.ts:** New module with `fetchCurrentUser()` for low-level `/auth/me` call. Store imports it; auth service uses it to avoid duplication.
- **sidebar.tsx:** Calls `refreshTenant()` on mount and when `pathname` changes (navigation) so plan badge and features stay current.
- **API:** `/auth/me` already fetches fresh tenant from DB via `findTenantById` — no change needed.

## Files changed

- `apps/web/lib/auth-api.ts` (new)
- `apps/web/store/auth-store.ts` — `refreshTenant` action
- `apps/web/features/auth/services/auth.service.ts` — use `fetchCurrentUser` from lib
- `apps/web/components/layout/sidebar.tsx` — `useEffect` to refresh on mount/navigation

## What's next

- Step 4.1: Sale soft delete with inventory restoration
