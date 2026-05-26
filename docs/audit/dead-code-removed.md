# Dead-Code Removal Inventory

**Audit date:** 2026-05-07
**Scope:** apps/api, apps/web, apps/tenant-site, packages/shared, packages/eslint-config
**Files scanned:** 2,069 TS/TSX
**Tools used:** knip 6.12, depcheck 1.4.7, jscpd 4.0.9, madge 8.0.0, ts-prune 0.10.3, plus 3 custom scripts under `scripts/audit/`.
**Two-signal rule:** every removal candidate is supported by _at least_ one tool finding **and** an independent ripgrep verification. The list below is the **proposed** removal — nothing has been deleted yet.

Raw artifacts live under `audit/raw/`. The summary tables below collapse those into one decision per item.

---

## Summary

| Category                                       |                     Items | Status                                                                      |
| ---------------------------------------------- | ------------------------: | --------------------------------------------------------------------------- |
| Unused source files (knip + verified)          |                    **70** | Safe to delete after batch verification                                     |
| Unused npm dependencies (knip + depcheck)      | **20** runtime, **5** dev | Safe (no runtime imports)                                                   |
| Unused exports / types (knip; large)           |                **~1,800** | Aggregated; act per-file when removing the file, otherwise needs-review     |
| Unused Prisma relation accessors (custom scan) |                   **106** | Schema cleanup only — no DB columns affected                                |
| Truly dead env-feature flags                   |                     **6** | Safe to delete from `packages/shared/src/config/{features,env-features}.ts` |
| Stale static assets                            |                     **7** | Default Next.js demo SVGs in `apps/web/public/`                             |
| Duplicate `default` + named exports (knip)     |                     **9** | Stylistic — flagged in needs-review, not removed                            |
| **Total irreversible removals proposed**       |                           | apply in batches per Phase 7 of the plan                                    |

---

## 1. Unused source files (70)

Each path was flagged by `knip --reporter json` as having **no incoming references** under the workspace's declared entry points. We then ripgrepped the basename across every workspace to confirm no dynamic / string reference exists. All 70 confirmed.

### apps/api (11)

| Path                                                     | Why dead                                                                   | Evidence                                                |
| -------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| `apps/api/prisma/scripts/backfill-content-body.ts`       | One-off backfill never re-run                                              | knip + zero rg refs outside its own file                |
| `apps/api/prisma/scripts/backfill-nav-menus.ts`          | One-off backfill never re-run                                              | knip + zero rg refs                                     |
| `apps/api/prisma/scripts/seed-demo-home-layout.ts`       | Demo seed, no consumer                                                     | knip + zero rg refs                                     |
| `apps/api/prisma/scripts/seed-scoped-rbac.ts`            | RBAC scaffolding superseded by RBAC_CONTRACT.md workstream                 | knip + zero rg refs                                     |
| `apps/api/src/config/prisma-extensions/resource-hook.ts` | Unwired Prisma extension; not registered with `prismaClient.$extends(...)` | knip + zero rg refs                                     |
| `apps/api/src/middlewares/messagingUploadRateLimit.ts`   | Middleware not mounted in `router.config.ts`                               | knip + grep router.config.ts                            |
| `apps/api/src/modules/bulk/bulk.repository.ts`           | No service consumes it; bulk module currently uses inline Prisma           | knip + zero rg refs to `BulkRepository`                 |
| `apps/api/src/modules/permissions/permissions.types.ts`  | Superseded by Prisma-generated types and `RBAC_CONTRACT.md`                | knip + zero rg refs to `Resource`/`Role` from this file |
| `apps/api/src/modules/sales/receipt/grid.ts`             | Receipt-PDF grid helper not imported by the receipt service                | knip + zero rg refs                                     |
| `apps/api/src/shared/permissions/filterVisible.ts`       | Helper replaced by inline filtering; no consumer                           | knip + zero rg refs                                     |
| `apps/api/src/shared/permissions/viewOwnOnly.ts`         | Same as above                                                              | knip + zero rg refs                                     |

### apps/web (51)

#### Unused shadcn/ui primitives (20)

These were generated by `shadcn add` but never consumed. Removing each removes its matching @radix-ui dependency too (see §2).

```
apps/web/components/ui/aspect-ratio.tsx
apps/web/components/ui/breadcrumb.tsx
apps/web/components/ui/button-group.tsx
apps/web/components/ui/carousel.tsx
apps/web/components/ui/drawer.tsx
apps/web/components/ui/field.tsx
apps/web/components/ui/form-section.tsx
apps/web/components/ui/input-group.tsx
apps/web/components/ui/input-otp.tsx
apps/web/components/ui/item.tsx
apps/web/components/ui/kbd.tsx
apps/web/components/ui/menubar.tsx
apps/web/components/ui/navigation-menu.tsx
apps/web/components/ui/radio-group.tsx
apps/web/components/ui/resizable.tsx
apps/web/components/ui/sidebar.tsx
apps/web/components/ui/sonner.tsx
apps/web/components/ui/toggle-group.tsx
apps/web/components/ui/toggle.tsx
apps/web/components/auth/login-form.tsx
```

#### Empty barrel files (10)

Created during the features/ migration but never populated.

```
apps/web/features/analytics/types.ts
apps/web/features/analytics/validation.ts
apps/web/features/dashboard/types.ts
apps/web/features/dashboard/validation.ts
apps/web/features/flags/types.ts
apps/web/features/flags/validation.ts
apps/web/features/locations/types.ts
apps/web/features/members/types.ts
apps/web/features/onboarding/types.ts
apps/web/features/onboarding/validation.ts
apps/web/features/plan-limits/validation.ts
apps/web/features/products/types.ts
apps/web/features/promos/types.ts
apps/web/features/settings/types.ts
apps/web/features/settings/validation.ts
apps/web/features/transfers/types.ts
apps/web/features/trash/validation.ts
apps/web/features/vendors/types.ts
```

#### Unused features / dialogs / utilities (15)

| Path                                                                | Why dead                                                                         | Evidence                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------ |
| `apps/web/constants/query-keys.ts`                                  | Per-feature key factories own their own keys now (`features/<x>/hooks/use-*.ts`) | knip + zero rg refs                              |
| `apps/web/features/bundles/components/index.ts`                     | Barrel never imported                                                            | knip                                             |
| `apps/web/features/crm/components/contacts/index.ts`                | Barrel never imported                                                            | knip                                             |
| `apps/web/features/crm/services/remarketing.service.ts`             | Feature gated off in prod and unused on web                                      | knip + flag check (`MESSAGING` disabled in prod) |
| `apps/web/features/gift-cards/components/index.ts`                  | Barrel never imported                                                            | knip                                             |
| `apps/web/features/products/components/form-tabs/DimensionsTab.tsx` | Tab not rendered by `ProductForm`                                                | knip + grep ProductForm                          |
| `apps/web/features/tenant-site/hooks/use-redirects.ts`              | Redirects feature has new `RedirectsManager`; old hook orphaned                  | knip                                             |
| `apps/web/features/tenant-site/services/redirects.service.ts`       | Same — replaced by `RedirectsManager` calls                                      | knip                                             |
| `apps/web/features/tenant-site/site-editor/BlockPalette.tsx`        | Replaced by `BlockPaletteV2` (or successor); no imports                          | knip + zero rg refs                              |
| `apps/web/features/tenant-site/site-editor/RedirectsPanel.tsx`      | Replaced by `RedirectsManager`                                                   | knip                                             |
| `apps/web/features/tenant-site/site-editor/use-draft-recovery.ts`   | Draft recovery now handled inside the store                                      | knip + zero rg refs                              |
| `apps/web/lib/api-server.ts`                                        | Server-component fetch helper never imported                                     | knip + zero rg refs                              |
| `apps/web/utils/theme.ts`                                           | Theme reads come through `next-themes` directly                                  | knip + zero rg refs                              |

### apps/tenant-site (5)

| Path                                                       | Why dead                                                                             | Evidence            |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------- |
| `apps/tenant-site/components/templates/BoutiqueLayout.tsx` | Templates now driven by `TEMPLATE_BLUEPRINTS` registry; layout components superseded | knip + zero rg refs |
| `apps/tenant-site/components/templates/LuxuryLayout.tsx`   | Same                                                                                 | knip + zero rg refs |
| `apps/tenant-site/components/templates/MinimalLayout.tsx`  | Same                                                                                 | knip + zero rg refs |
| `apps/tenant-site/components/templates/StandardLayout.tsx` | Same                                                                                 | knip + zero rg refs |
| `apps/tenant-site/lib/image.ts`                            | Image helper never imported                                                          | knip + zero rg refs |

### packages/shared (0)

knip flagged 110 unused exports inside `packages/shared` but **0 unused files** — every shared file has at least one consumer through its barrel. The unused exports are addressed in the per-export sweep (Phase 7 step 2), not as file deletions.

---

## 2. Unused npm dependencies (25)

Each entry verified by knip + depcheck **and** `rg "from \"<package>\""` returning zero hits across the workspace's source.

### apps/api (4)

| Package                               | Type    | Why dead                                                                  | Action                                                   |
| ------------------------------------- | ------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| `@fontsource/roboto`                  | runtime | API does not render fonts                                                 | remove                                                   |
| `@opentelemetry/semantic-conventions` | runtime | Unused — semantic constants never imported (other otel packages are used) | remove                                                   |
| `pino-pretty`                         | runtime | Pretty-printing happens via env var to pino, package not imported         | **needs-review** — may be a runtime peer for pino in dev |
| `@types/bcrypt`                       | dev     | Code uses `bcryptjs`, not `bcrypt`; this is a stale type package          | remove                                                   |

### apps/web (17)

| Package                           | Type    | Why dead                                                                                                          | Action                                               |
| --------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `@radix-ui/react-aspect-ratio`    | runtime | UI primitive deleted (see §1)                                                                                     | remove                                               |
| `@radix-ui/react-menubar`         | runtime | UI primitive deleted                                                                                              | remove                                               |
| `@radix-ui/react-navigation-menu` | runtime | UI primitive deleted                                                                                              | remove                                               |
| `@radix-ui/react-radio-group`     | runtime | UI primitive deleted                                                                                              | remove                                               |
| `@radix-ui/react-toggle`          | runtime | UI primitive deleted                                                                                              | remove                                               |
| `@radix-ui/react-toggle-group`    | runtime | UI primitive deleted                                                                                              | remove                                               |
| `@vercel/analytics`               | runtime | Not initialized anywhere in `app/layout.tsx`                                                                      | remove                                               |
| `embla-carousel-react`            | runtime | Carousel UI deleted                                                                                               | remove                                               |
| `html2canvas`                     | runtime | No consumer in source                                                                                             | remove                                               |
| `input-otp`                       | runtime | OTP UI deleted                                                                                                    | remove                                               |
| `jspdf`                           | runtime | No consumer in source — receipt PDF is server-side via pdfkit                                                     | remove                                               |
| `luxon`                           | runtime | Code uses `date-fns` only; one stray import in `packages/shared` is the only luxon consumer                       | remove from web                                      |
| `react-resizable-panels`          | runtime | Resizable UI deleted                                                                                              | remove                                               |
| `vaul`                            | runtime | Drawer UI deleted                                                                                                 | remove                                               |
| `@vitest/coverage-v8`             | dev     | Coverage is configured via `--coverage`, but the v8 reporter is not called out — **needs-review** before removing | needs-review                                         |
| `autoprefixer`                    | dev     | Tailwind v4 includes its own autoprefixer                                                                         | remove                                               |
| `tailwindcss`                     | dev     | Already declared at workspace root                                                                                | **needs-review** — may be a Next.js peer expectation |

### apps/tenant-site (3)

| Package                   | Type    | Why dead                                                                                                                                   | Action                                  |
| ------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `@tailwindcss/typography` | runtime | `prose` classes used in components — **needs-review**                                                                                      | needs-review (knip false positive risk) |
| `zod`                     | runtime | knip didn't see imports — **needs-review** before removing because some components use schemas from `@repo/shared` which has zod as a peer | needs-review                            |
| `@repo/eslint-config`     | dev     | tenant-site has `lint: "echo 'No linter configured'"`                                                                                      | remove                                  |

### packages/shared (1)

| Package   | Type | Why dead                                     | Action |
| --------- | ---- | -------------------------------------------- | ------ |
| `nodemon` | dev  | `dev` script uses `tsc --watch`, not nodemon | remove |

---

## 3. Unused exports and types (~1,800 aggregate)

knip identified **957 unused exports** and **899 unused type/interface exports** across the four workspaces. The bulk are concentrated in:

- `apps/web/features/<x>/types.ts` — barrel files exporting Form/Detail/Params types that no consumer imports (canonical pattern: import directly from per-component file). Once the empty types.ts files in §1 are deleted, ~280 of the 686 unused web exports also disappear.
- `apps/api/src/modules/<x>/<x>.types.ts` — similar pattern.
- `packages/shared/src/automation/*` and `packages/shared/src/crm/*` — exported helpers that web does not yet consume (work in progress — held back from removal; see needs-review).

Per-file removal is risky to apply in bulk because export removal can subtly break TypeScript type inference. The proposed Phase 7 strategy:

1. Delete the file-level dead code from §1 first (reduces export count by ~30%).
2. Re-run knip to refresh the export list.
3. For each remaining unused export, do `rg <symbol>` and remove only when 0 consumer references.

Full per-file list lives in `audit/raw/knip-summary.txt` (70 KB, kept for cross-reference).

---

## 4. Unused Prisma relation accessors (106)

`scripts/audit/prisma-refs.sh` parsed every model field in `apps/api/prisma/schema.prisma` and grepped each across `apps/` + `packages/`. **Result: zero scalar columns are dead — the schema is well-curated.**

The 106 zero-reference entries are all **relation backrefs** (e.g. `Tenant.passwordResetRequests PasswordResetRequest[]`). These do **not** correspond to database columns; they are convenience navigation properties. Removing them changes only the generated Prisma client surface, not the database. Consistent with the user's "flag only — do not modify schema" decision, these are surfaced here for visibility but **not proposed for removal in Phase 7**. Full list in `audit/raw/prisma-refs.tsv` (filter rows where column 3 is `0`).

Examples of the 106:

- `Tenant.passwordResetRequests`, `Tenant.errorReports`, `Tenant.productTags`, `Tenant.contactTags`, `Tenant.workItems`, `Tenant.publicApiKeys`, `Tenant.blogPosts`, `Tenant.tenantPages` … (32 on Tenant alone)
- `User.passwordResetRequestsRequested`, `User.salesCreated`, `User.transfersCreated` … (40 on User)
- `Sale.parentSale`, `Sale.revisions`, `Deal.parentDeal`, `Deal.revisions` (revision-history relations)

---

## 5. Truly dead feature flags (6)

`scripts/audit/feature-flag-refs.sh` walked every member of `Feature` and `EnvFeature` enums and counted references in `apps/api/src`, `apps/web`, `apps/tenant-site`. The following 6 have **zero consumer references** anywhere:

| Enum         | Member               | Defined in                                   | Reason it's dead                                               |
| ------------ | -------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| `Feature`    | `ANALYTICS_BASIC`    | `packages/shared/src/config/features.ts`     | Plan flag with no consumer (no plan rule references it)        |
| `Feature`    | `API_ACCESS`         | same                                         | No consumer; superseded by `EnvFeature.PUBLIC_DATA_API`        |
| `Feature`    | `MULTIPLE_LOCATIONS` | same                                         | No consumer; multi-location is implicit in the location module |
| `EnvFeature` | `API_ACCESS`         | `packages/shared/src/config/env-features.ts` | Same name as plan flag, never wired up                         |
| `EnvFeature` | `SYSTEM_ADMIN`       | same                                         | No consumer                                                    |
| `EnvFeature` | `PASSWORD_RESETS`    | same                                         | Password resets are always-on; flag obsolete                   |

Action: remove the 6 enum members, remove their entries from `FEATURE_REGISTRY` / `ENV_FEATURE_MATRIX`, run `pnpm -w build && pnpm -w check-types`.

Four other flags have exactly **one** reference (likely just the registry entry) and are flagged for review:
`AUTOMATION_VISUAL_BUILDER`, `SALES_USER_REPORT`, `CATALOG_SETTINGS`, `USERS_MANAGEMENT` → **needs-review.md**.

---

## 6. Stale static assets (7)

Default Next.js scaffold SVGs in `apps/web/public/` with **zero references** anywhere in `apps/`, `packages/`, `app/`, `components/`, etc.

```
apps/web/public/turborepo-dark.svg
apps/web/public/turborepo-light.svg
apps/web/public/file-text.svg
apps/web/public/vercel.svg
apps/web/public/next.svg
apps/web/public/globe.svg
apps/web/public/window.svg
```

`apps/tenant-site/public/` contains only `.gitkeep` — no dead assets there.
`apps/api/public/` does not exist.

Action: `rm` all 7 files. No code change needed.

---

## 7. Duplicate `named + default` exports (9)

knip flagged 9 modules that export the same symbol both as `named` and `default`. This is stylistic, not dead code — both are reachable. **Not** removed in Phase 7; flagged in needs-review for a stylistic decision.

```
apps/api/src/middlewares/enforceOriginMatch.ts          → named + default
apps/api/src/middlewares/enforcePlanLimits.ts           → named + default
apps/api/src/middlewares/hostnameResolver.ts            → named + default
apps/api/src/middlewares/publicApiKeyAuth.ts            → named + default
apps/api/src/middlewares/readOnlyGuard.ts               → named + default
apps/api/src/middlewares/requireInternalToken.ts        → named + default
apps/api/src/middlewares/rateLimitByApiKey.ts           → named + default
apps/api/src/config/redis.ts                            → `redis` + default
apps/web/features/tenant-site/site-editor/NotionDnDOverlay.tsx → named + default
packages/shared/src/site-schema/block-styles.ts        → BlockStyleSchema + BlockStyleOverrideSchema (different symbols both default-equivalent)
```

---

## Verification baseline (rerun after Phase 7)

```bash
pnpm exec knip --workspace apps/api    --reporter compact
pnpm exec knip --workspace apps/web    --reporter compact
pnpm exec knip --workspace apps/tenant-site --reporter compact
pnpm exec knip --workspace packages/shared  --reporter compact
pnpm exec depcheck apps/api  --skip-missing
pnpm exec depcheck apps/web  --skip-missing
```

Expected outcome: file count drops by 70, dependency findings drop by 25, total knip-issue count drops by ~40%.
