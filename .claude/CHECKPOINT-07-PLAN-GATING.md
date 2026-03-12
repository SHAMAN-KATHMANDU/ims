# Checkpoint 07 — Frontend Plan Gating Audit (Step 3.1)

**Status:** DONE
**Tests:** API 1 pre-existing failure (error-report 403 from Step 2.2), Web type check PASS

## What was done

- **Tenant usage API:** Added `GET /dashboard/usage` returning `{ users: { used, limit }, locations: { used, limit }, products: { used, limit } }`. Implemented `getTenantUsage()` in `enforcePlanLimits.ts` using plan limits + tenant overrides.
- **Usage counters:** Added "X of Y users/locations/products" to Users, Locations, Products pages. Disabled Add button when at plan limit on all three pages.
- **FeaturePageGuard:** Wrapped CRM Reports page with `FeaturePageGuard(ANALYTICS_ADVANCED)`.
- **usePlanFeatures fix:** When `plan` is null (e.g. before auth hydrate), hide all gated features instead of defaulting to STARTER. Platform admins still bypass.
- **LocationForm / ProductForm:** Added `addDisabled` prop to disable Add trigger when at limit.

## Files changed

- `apps/api/src/middlewares/enforcePlanLimits.ts` — `getTenantUsage()`, types
- `apps/api/src/modules/dashboard/dashboard.controller.ts` — `getTenantUsage` handler
- `apps/api/src/modules/dashboard/dashboard.router.ts` — `GET /usage`
- `apps/web/features/dashboard/services/dashboard.service.ts` — `getTenantUsage()`, `TenantUsage` type
- `apps/web/features/dashboard/hooks/use-dashboard.ts` — `useTenantUsage()`, `dashboardKeys.usage()`
- `apps/web/features/flags/use-feature-flag.ts` — conservative `usePlanFeatures` when plan is null
- `apps/web/app/[workspace]/(admin)/reports/crm/page.tsx` — `FeaturePageGuard(ANALYTICS_ADVANCED)`
- `apps/web/features/users/components/index.tsx` — usage counter, Add disabled when at limit
- `apps/web/features/locations/components/index.tsx` — usage counter, Add disabled when at limit
- `apps/web/features/locations/components/components/LocationForm.tsx` — `addDisabled` prop
- `apps/web/features/products/components/index.tsx` — usage counter, Add disabled when at limit
- `apps/web/features/products/components/components/ProductForm.tsx` — `addDisabled` prop

## What's next

- Step 3.2: Fix stale plan data (refresh tenant on navigation)
