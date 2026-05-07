# Items Requiring Human Decision

**Audit date:** 2026-05-07
**Purpose:** Items that look dead/duplicated by static analysis but where the tools cannot give a definitive verdict. Each row is one specific question for the team. **Nothing here is queued for deletion** until you give a per-row decision.

---

## A. Dependencies the tools flag as unused but might be runtime-implicit

| #   | Workspace        | Package                   | Question                                                                                                                                                                                  |
| --- | ---------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | apps/api         | `pino-pretty`             | Is `pino-pretty` invoked via the `PINO_TRANSPORT` env var or `pino` CLI args at runtime? If not, safe to remove. Decision: **remove** / **keep**                                          |
| A2  | apps/web         | `@vitest/coverage-v8`     | Coverage runs via `vitest --coverage` — does it implicitly require this provider? Test by removing locally and running `pnpm --filter web test:coverage`. Decision: **remove** / **keep** |
| A3  | apps/web         | `tailwindcss`             | Already in workspace-root `package.json`. Does Next.js typegen need a workspace-local copy? Decision: **remove** / **keep**                                                               |
| A4  | apps/tenant-site | `@tailwindcss/typography` | `prose` classes appear to be used in markdown rendering. Verify `tailwind.config.{js,ts}` doesn't list this as a `plugins` entry first. Decision: **remove** / **keep**                   |
| A5  | apps/tenant-site | `zod`                     | Used transitively via `@repo/shared`. Some tenant-site files might also import zod directly — please confirm. Decision: **remove** / **keep**                                             |

---

## B. Feature flags with exactly one reference

`scripts/audit/feature-flag-refs.sh` identified four `EnvFeature` flags whose only reference is the registry entry itself (zero consumers). They appear in `ENV_FEATURE_MATRIX` but no `useEnvFeatureFlag(EnvFeature.X)` call exists.

| #   | Flag                                   | Decision needed                                                                                                                                                              |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | `EnvFeature.AUTOMATION_VISUAL_BUILDER` | Used to be wired to the React Flow editor. Editor is now under `apps/web/features/automation/components/AutomationForm.tsx`. Is this flag dead, or just not wired correctly? |
| B2  | `EnvFeature.SALES_USER_REPORT`         | Sales reports do exist (`apps/web/features/analytics/components/SalesRevenuePage.tsx`). Is the per-user breakdown supposed to be gated by this flag?                         |
| B3  | `EnvFeature.CATALOG_SETTINGS`          | "Catalog settings" page may exist in the settings tab — verify it's not silently accessible without the gate.                                                                |
| B4  | `EnvFeature.USERS_MANAGEMENT`          | Users management page (`/[workspace]/(admin)/users/page.tsx`) renders unconditionally. Is this intentional?                                                                  |

For each: **remove flag** / **wire it up properly** / **leave as scaffolding for future use**.

Truly dead flags (zero references including registry entry, see dead-code-removed.md §5) are queued for deletion automatically: `Feature.ANALYTICS_BASIC`, `Feature.API_ACCESS`, `Feature.MULTIPLE_LOCATIONS`, `EnvFeature.API_ACCESS`, `EnvFeature.SYSTEM_ADMIN`, `EnvFeature.PASSWORD_RESETS`.

---

## C. Stylistic: named + default exports on the same module

knip flagged 9 modules that export the same symbol both as a named export and as the default. This is not dead code — both routes are reachable. The choice is project-style:

| #   | File                                                             | Symbols                                 |
| --- | ---------------------------------------------------------------- | --------------------------------------- |
| C1  | `apps/api/src/middlewares/enforceOriginMatch.ts`                 | `enforceOriginMatch` + `default`        |
| C2  | `apps/api/src/middlewares/enforcePlanLimits.ts`                  | `enforcePlanLimits` + `default`         |
| C3  | `apps/api/src/middlewares/hostnameResolver.ts`                   | `resolveTenantFromHostname` + `default` |
| C4  | `apps/api/src/middlewares/publicApiKeyAuth.ts`                   | `publicApiKeyAuth` + `default`          |
| C5  | `apps/api/src/middlewares/readOnlyGuard.ts`                      | `readOnlyGuard` + `default`             |
| C6  | `apps/api/src/middlewares/requireInternalToken.ts`               | `requireInternalToken` + `default`      |
| C7  | `apps/api/src/middlewares/rateLimitByApiKey.ts`                  | `rateLimitByApiKey` + `default`         |
| C8  | `apps/api/src/config/redis.ts`                                   | `redis` + `default`                     |
| C9  | `apps/web/features/tenant-site/site-editor/NotionDnDOverlay.tsx` | `NotionDnDOverlay` + `default`          |

Decision (apply across all 9): **drop default exports** / **drop named exports** / **leave both**.

The api codebase generally uses named exports per `.claude/rules/api-architecture.md`, suggesting **drop default exports** is the consistent pick.

---

## D. Unused Prisma relation accessors (106)

`scripts/audit/prisma-refs.sh` found 106 model-relation backrefs (e.g. `Tenant.passwordResetRequests`, `User.salesCreated`, `Sale.parentSale`) that are never traversed in code. These are not DB columns — removing them only changes the Prisma client surface.

Per the audit-scope decision ("flag only, do not modify schema"), no removal is queued. Two options for the team:

| #   | Question                                                         | Options                                                                                                                                             |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Should we open a follow-up PR to prune unused relation backrefs? | **yes (separate PR)** / **no, keep for navigability**. Pruning shrinks the Prisma client typings and reduces autogenerated typing churn on changes. |
| D2  | Should we lint against this drift?                               | **yes (a CI script that reruns this scan)** / **no**. Without a check, dead backrefs accumulate again.                                              |

Full list: `audit/raw/prisma-refs.tsv` (filter rows where column 3 == `0`). Subset of 32 on `Tenant`, 40 on `User`, plus revision-relation backrefs on `Sale`/`Deal`.

---

## E. Migrations whose names suggest a reversal

Per the recon, there is no name pattern (`revert_*`, `rollback_*`) suggesting reversal. We did find migrations whose **names** mention removal/cleanup, all of which look intentional (legacy field cleanup, index drop, etc.):

```
20260219071010_add_trash_deleted_at
20260223000000_remove_legacy_color_field
20260309111846_add_deleted_by_delete_reason
20260312160258_add_sale_soft_delete
20260320120000_drop_product_ims_code_unique
20260416120000_tenant_pages_drop_tier_enum
20260444120000_add_media_asset_soft_delete
```

| #   | Question                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------- |
| E1  | Confirm none of these need archival or squashing. **OK as-is** / **archive into a single baseline migration**. |

---

## F. AUDIT.md (April 25) cross-reference — items still open

Walked the original AUDIT.md against current code state. Status assessment:

| §   | Original finding (P)                             | Current state                                                                                                                                         |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | Dual `features/` + `views/` + `services/` (P1)   | ✅ **Resolved.** `apps/web/views/` and `apps/web/services/` no longer exist.                                                                          |
| 1.2 | Cross-feature coupling bypassing `index.ts` (P1) | 🟡 **Partially resolved.** Most flagged imports still present in older modules — needs spot check.                                                    |
| 1.4 | Feature-lock leaks at hook layer (P0)            | 🟡 **Mostly fixed.** `use-deals.ts`, `use-pipelines.ts`, `use-messages.ts` now gate. **`use-contacts.ts` still leaks** (no `useEnvFeatureFlag`).      |
| 1.5 | God components (>1000 lines) (P1)                | 🟡 SiteEditorPage 3,363→836 (resolved). NewSaleForm 2,264→2,369 (still open). ProductTable 1,035→564 (improved). AutomationForm 1,347→330 (resolved). |
| 1.6 | `components/components/` nested folders (P2)     | ✅ **Resolved.** Zero matches found.                                                                                                                  |
| 3.1 | 12 near-identical Table implementations (P0)     | 🔴 **Still open.** Still 12 `*Table.tsx` files.                                                                                                       |
| 3.7 | Redundant nested `components/` folders (P2)      | ✅ Mostly resolved. Only `apps/web/features/settings/role-management/components` remains, which is at the right depth.                                |
| 6.4 | Deprecated `useProducts()` still exported (P2)   | ✅ **Resolved.** Symbol removed.                                                                                                                      |

| #   | Question                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Want me to run the same status pass for **all 38** AUDIT.md findings (not just the spot checks)? **yes** / **no**.                       |
| F2  | Should I append the 2026-05-07 findings to `AUDIT.md` itself or keep them in `audit/`? **append to AUDIT.md** / **keep in audit/ only**. |

---

## G. shadcn/ui primitives — bulk delete or staged?

Twenty unused shadcn/ui primitive components (§1 of dead-code-removed.md). Each comes with one or two `@radix-ui` dependencies.

| #   | Question                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G1  | Confirm bulk-deletion is fine. Risk: a shadcn `add` workflow might restore one of these later, and a developer might import the new one without realizing it was just removed. Mitigation: add a comment to a component-naming guide. **bulk-delete now** / **leave for future shadcn re-add** / **delete with a "this was unused as of 2026-05-07" note in CLAUDE.md**. |

---

## H. Web `luxon` removal

knip flags `luxon` as unused in `apps/web` (web uses `date-fns`). However, `packages/shared` _does_ use `luxon` (in `src/utils/date.ts`). Removing luxon from web's `package.json` is correct, but ensure pnpm hoisting doesn't accidentally make it unavailable to shared.

| #   | Question                                                                              |
| --- | ------------------------------------------------------------------------------------- |
| H1  | Confirm web removal won't break shared. **proceed** / **defer pending verification**. |

---

## I. `apps/api/src/config/prisma-extensions/resource-hook.ts`

Listed as unused by knip. The file appears to have been written for the RBAC_CONTRACT.md workstream and may be part of work-in-progress.

| #   | Question                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Confirm `resource-hook.ts` is genuinely abandoned, **not** parked for the in-flight RBAC workstream. **safe to delete** / **keep until RBAC ships**. |

---

## J. Prisma scripts under `apps/api/prisma/scripts/`

Four scripts are in the dead-code list (one-off backfills + a demo seed):

```
backfill-content-body.ts
backfill-nav-menus.ts
seed-demo-home-layout.ts
seed-scoped-rbac.ts
```

| #   | Question                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J1  | One-off backfills can be useful as historical reference. Options: **delete** (recoverable from git), **move to `apps/api/prisma/scripts/_archived/`**, **keep**. |

---

## How to respond

For each item with a `Decision:` or `Question:` field, paste back the `#` ID + your choice. Then I'll proceed with Phase 7 in batches per the approved plan: deps → exports → files → flags → consolidations.
