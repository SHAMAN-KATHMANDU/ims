# Single-Source-of-Truth Consolidations

**Audit date:** 2026-05-07
**Source signals:** `jscpd` clones report (602 clones, 4.86% duplicated tokens) plus targeted ripgrep verification of recon-flagged hotspots.
**Rule:** every duplicated concept gets exactly one canonical home, with its current homes either re-exporting from the canonical or replaced by imports of the canonical.

The list is **proposed**. Nothing has been edited yet.

---

## Summary

| Concept                                                               | Locations today                              | Canonical target                                       | Risk        |
| --------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------ | ----------- |
| `UserRole` enum / type                                                | 3 (1 canonical, 1 dup, 1 unused)             | `packages/shared/src/types/user.ts`                    | Low         |
| `LoginSchema`, `ForgotPasswordSchema`                                 | 2 (api + web, with subtle divergence)        | `packages/shared/src/schemas/auth.ts` (new)            | Low         |
| Phone parse / validate utilities                                      | 2 (api + web, divergent field name)          | `packages/shared/src/utils/phone.ts` (new)             | Medium      |
| `slugifyTitle()` function                                             | 3 (snippets, tenant-pages, tenant-blog)      | `packages/shared/src/utils/slug.ts` (new)              | Low         |
| Slug regex pattern                                                    | 4 inline copies                              | shared constant in `packages/shared/src/utils/slug.ts` | Low         |
| Per-feature delete-confirmation dialog scaffolding                    | ~6 near-duplicates flagged by jscpd          | extract a `<DeleteEntityDialog>` primitive             | Medium (UI) |
| Dashboard "shortcut" widgets                                          | 4 near-duplicates flagged by jscpd           | extract a `<ShortcutCard>` primitive                   | Low         |
| Internal repetition in `WorkflowEditorPage`, `TasksPage`, `LeadsPage` | within-file blocks of 14–95 lines duplicated | extract local helper functions / sub-components        | Medium      |

Total in-scope duplications **proposed for collapse**: 8 concepts. Total **flagged but kept as-is** (intentional or risky): see needs-review.

---

## 1. `UserRole` enum / type — 3 locations

| Location                                                   | Form                                                                      | Status                                                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/src/types/user.ts:12`                     | `enum UserRole { PLATFORM_ADMIN = "platformAdmin", … }`                   | **Canonical** — already exported via `@repo/shared` index                                                                                            |
| `apps/web/utils/auth.ts:8`                                 | `type UserRole = "platformAdmin" \| "superAdmin" \| "admin" \| "user"`    | **Duplicate** — string literal union with the same values                                                                                            |
| `apps/api/src/modules/permissions/permissions.types.ts:18` | `interface UserRole { userId, roleId, tenantId, assignedAt, assignedBy }` | **Different concept** (RBAC join row) — and the file itself is in the dead-code list (§1 of dead-code-removed.md). Removed when the file is removed. |

### Action

1. In `apps/web/utils/auth.ts`, replace the local `UserRole` definition with `import { UserRole } from "@repo/shared"`. The enum values are string-equal to the literals, so `user.role === "platformAdmin"` still works.
2. Update every consumer's `import type { UserRole } from "@/utils/auth"` if needed (no change if they already import from `auth.ts`).
3. `apps/api/src/modules/permissions/permissions.types.ts` is removed via the dead-code sweep — no separate action.

### Verification

```bash
rg "type UserRole|interface UserRole|enum UserRole" apps packages --type ts
```

Should return exactly the one definition in `packages/shared/src/types/user.ts`.

---

## 2. `LoginSchema` + `ForgotPasswordSchema` — 2 locations with divergence

| Location                                      | Notes                                                        |
| --------------------------------------------- | ------------------------------------------------------------ |
| `apps/api/src/modules/auth/auth.schema.ts:21` | Adds `.transform(s => s.toLowerCase().trim())` on `username` |
| `apps/web/features/auth/validation.ts:3`      | Plain `z.string().min(1)` — **no normalization**             |

This divergence is a real user-facing bug: the web form may send `"Bob"` while the API normalizes to `"bob"`. If a user typed their username with capitalisation that differs from how they registered, login fails until the API normalises the new attempt.

### Action

1. Create `packages/shared/src/schemas/auth.ts`:
   ```ts
   import { z } from "zod";
   export const LoginSchema = z.object({
     username: z
       .string()
       .transform((s) => s?.toString().toLowerCase().trim() ?? "")
       .pipe(z.string().min(1, "Username is required")),
     password: z.string().min(1, "Password is required"),
   });
   export type LoginDto = z.infer<typeof LoginSchema>;
   export const ForgotPasswordSchema = z.object({
     username: z
       .string()
       .transform((s) => s?.toString().toLowerCase().trim() ?? "")
       .pipe(z.string().min(1, "Username is required")),
   });
   export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
   ```
2. Add `export * from "./src/schemas/auth"` to `packages/shared/index.ts`.
3. In `apps/api/src/modules/auth/auth.schema.ts` re-export from shared:
   ```ts
   export { LoginSchema, ForgotPasswordSchema } from "@repo/shared";
   export type { LoginDto, ForgotPasswordDto } from "@repo/shared";
   ```
4. In `apps/web/features/auth/validation.ts` replace local `LoginSchema`/`ForgotPasswordSchema` with re-exports from `@repo/shared`. `SlugSchema` and `LoginInput`/`SlugInput`/`ForgotPasswordInput` aliases stay where they are.
5. Run web auth tests + api auth tests + e2e login spec.

### Note on behavior change

Web users typing `"Bob"` will now have it normalized to `"bob"` _client-side_ before the request. This is the intent the API already enforces. If the team prefers to preserve the current bug-compatible behavior, the canonical definition can keep `transform` only for `LoginSchema` and not for `ForgotPasswordSchema` — but recommend aligning both with the API.

---

## 3. Phone parse / validate utilities — 2 locations, divergent shapes

| Location                         | Field name in failure case | Extra exports                                                                                          |
| -------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `apps/api/src/utils/phone.ts:11` | `message: string`          | none                                                                                                   |
| `apps/web/lib/phone.ts:15`       | `error: string`            | `getCountries`, `getCountryCallingCode`, `isValidPhoneRequired`, `isValidPhoneOptional` (Zod refiners) |

`PhoneParseResult` shape diverges (`message` vs `error`). Risk: any cross-app result-passing breaks.

### Action

1. Create `packages/shared/src/utils/phone.ts` with a **single** `PhoneParseResult` type — pick `message` (matches the rest of the API, less ambiguous than `error`) and the union:
   ```ts
   export type PhoneParseResult =
     | { valid: true; e164: string }
     | { valid: false; message: string };
   export function parseAndValidatePhone(
     value: string,
     defaultCountry?: CountryCode,
   ): PhoneParseResult;
   export function normalizePhoneRequired(
     value: string,
     defaultCountry?: CountryCode,
   ): string;
   export function normalizePhoneOptional(
     value: string | undefined,
     defaultCountry?: CountryCode,
   ): string | null;
   ```
2. Move the Zod refiners (`isValidPhoneRequired`, `isValidPhoneOptional`) to the same shared file so api can use them too.
3. Re-export `getCountries`, `getCountryCallingCode`, `CountryCode` from shared (these are pass-throughs from `libphonenumber-js`).
4. Add `export * from "./src/utils/phone"` to `packages/shared/index.ts`.
5. Replace `apps/api/src/utils/phone.ts` content with a re-export from `@repo/shared`. Replace `apps/web/lib/phone.ts` similarly.
6. Update web call sites that destructure `result.error` → use `result.message`. Grep:
   ```bash
   rg "phoneResult\.error|\.error\)" apps/web/components/ui/phone-input.tsx apps/web/features/*/components/
   ```
7. Run unit tests for both apps.

### Risk

Web call sites use `.error`. Touching them is mechanical but spans ~5 files. Tests cover the surface (`apps/web/features/vendors/components/VendorForm.test.tsx`, `MemberForm.test.tsx`).

---

## 4. `slugifyTitle()` — 3 identical copies

| Location                                          | Implementation |
| ------------------------------------------------- | -------------- |
| `apps/web/features/snippets/validation.ts:19`     | identical      |
| `apps/web/features/tenant-pages/validation.ts:85` | identical      |
| `apps/web/features/tenant-blog/validation.ts:83`  | identical      |

### Action

1. Create `packages/shared/src/utils/slug.ts`:
   ```ts
   export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
   export function slugifyTitle(title: string): string {
     /* exact body from existing impls */
   }
   ```
2. Add to `packages/shared/index.ts`.
3. In each of the three feature `validation.ts` files, replace the function with `export { slugifyTitle } from "@repo/shared"` (kept as a re-export so consumers don't need updating).
4. The four scattered slug regex patterns (`apps/api/src/modules/bundles/bundle.schema.ts`, `apps/api/src/modules/collections/collections.schema.ts`, `apps/web/features/bundles/validation.ts`, `apps/web/features/auth/validation.ts`) — replace each inline `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` with `import { SLUG_REGEX } from "@repo/shared"`.

---

## 5. Delete-confirmation dialogs — 6 near-duplicates

`jscpd` flagged repeated 11–33 line blocks across:

- `apps/web/features/products/components/dialogs/SubcategoryDeleteDialog.tsx`
- `apps/web/features/products/components/dialogs/VariationDeleteDialog.tsx`
- `apps/web/features/products/components/dialogs/ProductDeleteDialog.tsx`
- `apps/web/features/products/components/dialogs/CategoryDeleteDialog.tsx`

These 4 files carry the same shadcn-`AlertDialog` skeleton, the same loading-state handling, and the same toast pattern.

### Action

Extract a generic `<DeleteEntityDialog>` to `apps/web/components/ui/delete-entity-dialog.tsx` parameterised by:

- `entityName: string` (e.g. `"product"`)
- `entityLabel: string` (e.g. specific name)
- `onConfirm: () => Promise<void>`
- optional `extraWarning: ReactNode`

Each dialog file becomes ~15 lines of wrapper. Estimated diff: -200 lines net.

### Risk

Medium. Each dialog has subtle differences (extra warning copy, link to docs). The primitive must accept `children` for those overrides. If the team prefers to keep them separate for design freedom, this can be deferred.

---

## 6. Dashboard "shortcut" widgets — 4 near-duplicates

`jscpd` flagged 24-line blocks across:

- `apps/web/features/dashboard/components/widgets/AdminShortcuts.tsx`
- `apps/web/features/dashboard/components/widgets/CrmShortcuts.tsx`
- `apps/web/features/dashboard/components/widgets/PlatformAdminShortcuts.tsx`
- `apps/web/features/dashboard/components/widgets/SuperAdminShortcuts.tsx`

All four render a grid of clickable cards from a hard-coded list of `{title, href, icon, description}`.

### Action

Extract `<ShortcutGrid items={Shortcut[]} />` primitive in `apps/web/features/dashboard/components/widgets/ShortcutGrid.tsx`. Each role-specific widget becomes a 5-line file declaring its `items` array and rendering `<ShortcutGrid>`. Diff: -60 lines net.

---

## 7. Internal repetition (within-file)

jscpd found large within-file duplicate blocks. Refactor into local helper functions or sub-components:

| File                                                                                           | Duplicated block                       | Suggested extraction                                                                       |
| ---------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/web/features/crm/components/tasks/TasksPage.tsx:421 ⇄ 622`                               | 95 lines (column setup + render logic) | extract `<TaskRowActions>` and `useTaskColumns()` hook                                     |
| `apps/web/features/crm/components/leads/LeadsPage.tsx` 14–15 line blocks across multiple lines | filter / column / action repetition    | factor common pieces with `TasksPage.tsx` into `apps/web/features/crm/components/_shared/` |
| `apps/web/features/crm/components/workflows/WorkflowEditorPage.tsx:599 ⇄ 629`                  | 44 lines (graph rendering setup)       | extract `WorkflowGraph` sub-component                                                      |

These are touchier refactors than the others — propose for a follow-up PR rather than the bulk consolidation pass.

---

## 8. The `re-export drift` check (passed)

Recon worried that `packages/shared/index.ts` might be missing barrel re-exports of internal subpaths consumed by apps. We verified:

- `packages/shared/index.ts` re-exports: `utils/date`, `media/mimeFromExtension`, `types/user`, `config/{features,env-features}`, `automation/*`, `crm/*`, `site-schema`, `permissions/catalog`, `blocks`, plus `APP_VERSION`.
- A grep for `from "@repo/shared/internal"` and `from "@repo/shared/src/"` returned zero hits.

No action needed.

---

## What is NOT being consolidated

- **`apps/web/lib/api-error.ts` `MESSAGES` object.** User-facing copy is intentionally web-only; API never serves these strings.
- **Per-feature DTO interfaces** (`Product`, `Category`, etc.) defined separately in api and web. Co-evolution is too costly given current API/UI velocity; the contract is enforced by the integration test suite, not by a shared type. (Recommend revisiting this after the RBAC_CONTRACT.md workstream lands.)
- **Block-renderer + block-schema split.** Editor (`apps/web`) and renderer (`apps/tenant-site`) intentionally consume the same schemas from `@repo/shared/blocks` — already single-source.

---

## Verification (after Phase 7 step 5)

```bash
pnpm -w build            # all four workspaces compile
pnpm -w check-types       # zero TS errors
pnpm test:all             # auth, vendor, member tests cover the touched surfaces
pnpm exec jscpd --config .jscpdrc.json apps packages > audit/raw/jscpd-after.txt
diff audit/raw/jscpd/jscpd-report.json audit/raw/jscpd-after/jscpd-report.json | head
```

Target: clone count drops from 602 to <580, duplicated-token percentage drops below 4.5%.
