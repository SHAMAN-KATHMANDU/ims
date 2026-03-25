---
name: feature-lock-enforcement
description: Enforces feature flag architecture with route, hook, and component gating to guarantee zero API calls for disabled features. Use when adding/changing env or plan flags, CRM subfeatures, or any gated frontend behavior.
---

# Feature Lock Enforcement

Apply this workflow whenever a feature is env-gated or plan-gated.

## Goal

Ensure disabled features produce silent no-call behavior:

- no API requests
- no mounted dependent hook logic
- no visible broken UI

## 1) Map Feature to Scope

For each flag, map:

- pages/routes affected
- hooks/services affected
- UI sections/tabs/actions affected

Use `rg` to find all consumers of changed hooks/services.

## 2) Enforce Three-Layer Gating

### A. Route/Page Layer

- Use `EnvFeaturePageGuard` for env flags.
- Add `FeaturePageGuard` when plan-gated.

### B. Hook Layer

- Add optional `options?: { enabled?: boolean }` where useful.
- Compute local feature gate in hook.
- Gate query with:

```typescript
enabled: featureEnabled && (options?.enabled ?? true);
```

### C. Component Layer

- Compute the same feature gate in component.
- Only call/mount feature-specific hooks with explicit `enabled`.
- Hide related UI blocks when disabled.

## 3) CRM Flag Mapping Standard

- `CRM_DEALS` -> deal hooks/components/pages
- `CRM_WORKFLOWS` -> workflow hooks/editor/page
- `CRM_REPORTS` -> CRM reports hook/page
- `CRM_PIPELINES_TAB` -> pipeline hooks/settings tab

## 4) Safe Defaults

If feature is disabled:

- query returns idle/inactive via `enabled: false`
- section is not rendered
- no fallback error toast for missing disabled endpoints

## 5) Verification Loop

1. `rg` all hook/service consumers and confirm each is gated.
2. Confirm guarded routes use correct `EnvFeature`.
3. Run:
   - `cd apps/web && npx tsc --noEmit`
4. Re-run `rg` for unguarded hook calls.

## Anti-Patterns

- Hiding only nav items while queries still run
- Query guard in component but missing guard inside shared hook
- Gating page but mounting child in another unguarded route
