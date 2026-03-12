# Enterprise Bug Fix Plan — Step-by-Step Execution Guide

**Branch:** `fix/bug/12-mar-final`
**Dev server:** Already running via `pnpm dev`

---

## RULES FOR EVERY STEP

After EVERY code change:

1. **Run tests for the changed app:**
   ```bash
   cd apps/api && pnpm test:run    # if you changed API files
   cd apps/web && pnpm test:run    # if you changed Web files
   ```
2. **Run type check:**
   ```bash
   cd apps/api && npx tsc --noEmit
   cd apps/web && npx tsc --noEmit
   ```
3. **Fix any test or type errors before moving on.**
4. **Check the UI** in the browser (dev server is running).
5. **Commit** with a clear message describing what was fixed.
6. **Update the checkpoint file** in `.claude/` after each commit.

---

## PHASE 1 — Form Infrastructure (do first, everything depends on this)

### Step 1.1 — Unsaved Changes Guard (all modal forms)

**What:** Prevent accidental form data loss when clicking outside a modal.

**Files to change:**
- `apps/web/components/ui/dialog.tsx`
- `apps/web/components/ui/sheet.tsx`

**How:**
1. Read `apps/web/components/ui/dialog.tsx`
2. Find the `DialogContent` component
3. Add `onInteractOutside` and `onEscapeKeyDown` props that call `event.preventDefault()` by default
4. Add a new prop `allowDismiss?: boolean` (default `false` for forms, `true` for info dialogs)
5. Do the same for `SheetContent` in `sheet.tsx`
6. This automatically protects ALL 20+ forms that use Dialog or Sheet

**Test:** Open any form dialog (e.g., Add Product), fill in data, click outside. It should NOT close.

**Commit:** `fix: prevent modal forms from closing on outside click`
**Checkpoint:** `.claude/CHECKPOINT-01-UNSAVED-GUARD.md`

---

### Step 1.2 — Per-Step Validation on Product Form

**What:** Validate fields on each tab before allowing "Next" in the product form.

**Files to change:**
- `apps/web/features/products/components/components/ProductForm.tsx`

**How:**
1. Read the file, find `handleNext()` function
2. Before advancing tab, validate the current tab's fields:
   - General tab: name, categoryId, imsCode, costPrice, mrp (and mrp >= costPrice)
   - Dimensions tab: validate if values are valid numbers
   - Variations tab: validate stock quantities
3. Show errors on the current tab and block advancement if invalid
4. Keep the final submit validation as a safety net

**Test:** Open Add Product, leave name empty, click Next. Should show error and stay on General tab.

**Commit:** `fix: add per-step validation to product form`
**Checkpoint:** `.claude/CHECKPOINT-02-STEP-VALIDATION.md`

---

### Step 1.3 — Phone Input with Country Flags

**What:** Rewrite PhoneInput to show country flags, be searchable, and block submission on invalid.

**Files to change:**
- `apps/web/components/ui/phone-input.tsx`
- `apps/web/package.json` (add `country-flag-icons`)

**How:**
1. Run `cd apps/web && pnpm add country-flag-icons`
2. Read `apps/web/components/ui/phone-input.tsx`
3. Replace the Radix `Select` with a `Popover` + `Command` (combobox) for searchable country list
4. Import flag SVGs from `country-flag-icons/react/3x2` and show them next to country names
5. Make the container wider to fit flag + code + number
6. When phone is present but invalid, set a form-level error that blocks submission (not just visual "Invalid" text)

**Test:** Open any form with phone (Vendor, Contact, Member, Sales). Should see flags, be able to search countries, and invalid numbers should block submit.

**Commit:** `fix: rewrite phone input with country flags and blocking validation`
**Checkpoint:** `.claude/CHECKPOINT-03-PHONE-INPUT.md`

---

### Step 1.4 — Numeric Input Component

**What:** Create a shared numeric input that blocks non-numeric characters.

**Files to create/change:**
- `apps/web/components/ui/numeric-input.tsx` (new)
- `apps/web/features/products/components/components/form-tabs/GeneralTab.tsx`
- `apps/web/features/products/components/components/form-tabs/DimensionsTab.tsx`
- `apps/web/features/products/components/components/form-tabs/VariationsTab.tsx`

**How:**
1. Create `numeric-input.tsx` — wraps `Input` with `inputMode="decimal"`, strips non-numeric on input, shows error on blur
2. Replace `type="number"` inputs in GeneralTab (costPrice, mrp), DimensionsTab (length, breadth, height, weight), VariationsTab (stock)

**Test:** Type "abc" into cost price field. Should not accept letters.

**Commit:** `fix: add numeric input component, block non-numeric characters`
**Checkpoint:** `.claude/CHECKPOINT-04-NUMERIC-INPUT.md`

---

## PHASE 2 — Auth & Password Reset

### Step 2.1 — Password Reset Request System

**What:** Build forgot-password flow where requests go to superadmin (or platform admin for superadmins).

**Files to create/change:**

Backend:
- `apps/api/prisma/schema.prisma` — add `PasswordResetRequest` model + enum
- `apps/api/src/modules/auth/auth.schema.ts` — add `ForgotPasswordSchema`
- `apps/api/src/modules/auth/auth.service.ts` — add `requestPasswordReset()`
- `apps/api/src/modules/auth/auth.controller.ts` — add `forgotPassword` handler
- `apps/api/src/modules/auth/auth.router.ts` — add `POST /auth/forgot-password`
- `apps/api/src/modules/users/user.service.ts` — add `getPasswordResetRequests()`, `approveResetRequest()`, `escalateResetRequest()`
- `apps/api/src/modules/users/user.controller.ts` — add handlers
- `apps/api/src/modules/users/user.router.ts` — add routes
- `apps/api/src/modules/platform/platform.service.ts` — add `getPlatformResetRequests()`, `approveResetRequest()`
- `apps/api/src/modules/platform/platform.controller.ts` — add handlers
- `apps/api/src/modules/platform/platform.router.ts` — add routes

Frontend:
- `apps/web/features/auth/components/ForgotPasswordPage.tsx` (new)
- `apps/web/features/auth/components/LoginForm.tsx` — add "Forgot Password?" link
- `apps/web/app/forgot-password/page.tsx` (new route)
- `apps/web/features/settings/components/PasswordResetRequestsPage.tsx` (new — superadmin view)
- `apps/web/features/tenants/components/PlatformResetRequestsPage.tsx` (new — platform admin view)

**Prisma model to add:**
```prisma
enum PasswordResetStatus {
  PENDING
  APPROVED
  REJECTED
  ESCALATED
}

model PasswordResetRequest {
  id            String              @id @default(uuid()) @map("reset_request_id")
  tenantId      String              @map("tenant_id")
  requestedById String              @map("requested_by_id")
  status        PasswordResetStatus @default(PENDING)
  escalated     Boolean             @default(false)
  handledById   String?             @map("handled_by_id")
  handledAt     DateTime?           @map("handled_at")
  createdAt     DateTime            @default(now()) @map("created_at")
  updatedAt     DateTime            @updatedAt @map("updated_at")

  tenant      Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  requestedBy User   @relation("ResetRequester", fields: [requestedById], references: [id])
  handledBy   User?  @relation("ResetHandler", fields: [handledById], references: [id])

  @@map("password_reset_requests")
}
```

**Flow:**
- Staff/admin forgot password → request goes to tenant superadmin
- Superadmin forgot password → request goes to platform admin
- Superadmin can escalate to platform admin if they can't handle it
- All requests also visible to platform admin

**After migration:** `cd apps/api && npx prisma migrate dev --name add-password-reset-requests`

**Commit:** `feat: add tiered password reset request system`
**Checkpoint:** `.claude/CHECKPOINT-05-PASSWORD-RESET.md`

---

### Step 2.2 — Error Reports: Platform Admin Only

**What:** Remove status change ability from non-platform-admin users.

**Files to change:**
- `apps/web/features/settings/components/ErrorReportsPage.tsx` — hide status Select for non-platform users
- `apps/api/src/modules/error-reports/` — add role check on PATCH

**Commit:** `fix: restrict error report status changes to platform admin`
**Checkpoint:** `.claude/CHECKPOINT-06-ERROR-REPORTS.md`

---

## PHASE 3 — Plan Enforcement

### Step 3.1 — Frontend Plan Gating Audit

**What:** Hide features that the current plan doesn't support.

**Files to change:**
- `apps/web/components/layout/sidebar.tsx` — gate Analytics, Promos, Audit Logs, Deals sidebar items
- `apps/web/features/flags/use-feature-flag.ts` — fix `isFeatureAvailable` plan hierarchy comparison
- All plan-gated pages in `apps/web/app/[workspace]/` — wrap with `FeaturePageGuard`
- Add usage counters ("2 of 3 users") on Users, Locations, Products pages

**Commit:** `fix: enforce plan-based feature gating across frontend`
**Checkpoint:** `.claude/CHECKPOINT-07-PLAN-GATING.md`

---

### Step 3.2 — Fix Stale Plan Data

**What:** Ensure plan badge and features reflect the actual current plan.

**Files to change:**
- `apps/web/store/auth-store.ts` — add `refreshTenant()` method
- `apps/web/components/layout/sidebar.tsx` — call refresh on mount
- `apps/api/src/modules/auth/auth.service.ts` — ensure `/auth/me` returns fresh plan from DB

**Commit:** `fix: refresh tenant plan data to prevent stale plan display`
**Checkpoint:** `.claude/CHECKPOINT-08-STALE-PLAN.md`

---

## PHASE 4 — Sales Enterprise Upgrade

### Step 4.1 — Sale Soft Delete

**What:** Add soft delete to sales (no cron job, just mark as deleted and restore inventory).

**Files to change:**
- `apps/api/prisma/schema.prisma` — add `deletedAt`, `deletedBy`, `deleteReason` to Sale model
- `apps/api/src/modules/sales/sale.repository.ts` — add `softDelete()`, exclude deleted from queries
- `apps/api/src/modules/sales/sale.service.ts` — add `deleteSale()` with inventory restoration
- `apps/api/src/modules/sales/sale.controller.ts` — add `deleteSale` handler
- `apps/api/src/modules/sales/sale.router.ts` — add `DELETE /sales/:id`
- `apps/api/src/modules/sales/sale.schema.ts` — add `DeleteSaleSchema`
- `apps/web/features/sales/services/sales.service.ts` — add `deleteSale()`
- `apps/web/features/sales/hooks/use-sales.ts` — add `useDeleteSale()`
- `apps/web/features/sales/components/components/SaleDetail.tsx` — add delete button

**After migration:** `cd apps/api && npx prisma migrate dev --name add-sale-soft-delete`

**Commit:** `feat: add sale soft delete with inventory restoration`
**Checkpoint:** `.claude/CHECKPOINT-09-SALE-DELETE.md`

---

### Step 4.2 — Sale Edit with Branching

**What:** Editing a sale creates a new revision linked to the original.

**Files to change:**
- `apps/api/prisma/schema.prisma` — add `parentSaleId`, `revisionNo`, `isLatest`, `editReason`, `editedById`, `editedAt` to Sale; add self-relation
- `apps/api/src/modules/sales/sale.service.ts` — add `editSale()` that creates a branch
- `apps/api/src/modules/sales/sale.controller.ts` — add `editSale` handler
- `apps/api/src/modules/sales/sale.router.ts` — add `POST /sales/:id/edit`
- `apps/api/src/modules/sales/sale.schema.ts` — add `EditSaleSchema`
- `apps/web/features/sales/components/components/SaleDetail.tsx` — add Edit button, revision timeline
- `apps/web/features/sales/components/components/EditSaleForm.tsx` (new) — pre-filled form
- Frontend service + hook updates

**After migration:** `cd apps/api && npx prisma migrate dev --name add-sale-edit-branching`

**Commit:** `feat: add sale edit with revision branching`
**Checkpoint:** `.claude/CHECKPOINT-10-SALE-EDIT.md`

---

### Step 4.3 — Sales Form Fixes

**What:** Fix multiple sales form issues.

**Files to change:**
- `apps/web/features/sales/components/components/NewSaleForm.tsx`
- `apps/api/src/modules/sales/sale.service.ts`

**Sub-tasks (do all in one commit):**

1. **Search-only products (14.4c):** Remove pre-loaded product list. Show empty state "Search for products...". Only fetch on search input (debounced 300ms).

2. **Lock showroom (14.4f):** Disable showroom Select when `cartItems.length > 0`. Show lock icon. Add "Clear cart to change" confirmation.

3. **Payment mismatch fix (14.4h):** Only validate payment total when `!isCreditSale && payments.length > 0`.

4. **Currency display (14.4i):** Show "NPR" prefix on all monetary displays (remaining, total, subtotal).

5. **Credit + full payment (14.4o):** When `isCreditSale` is checked but payments equal total, auto-uncheck credit and show warning toast.

6. **Clean up header (14.1):** Remove redundant header elements.

7. **Credit checkbox CSS (14.4b):** Fix opacity/transparency on the credit sale toggle.

**Commit:** `fix: sales form — search-only products, lock showroom, payment fixes, credit logic`
**Checkpoint:** `.claude/CHECKPOINT-11-SALES-FORM.md`

---

### Step 4.4 — Enterprise Discount in Sales

**What:** Add manual discount rate entry (not just promo codes) with authorization.

**Files to change:**
- `apps/api/prisma/schema.prisma` — add `manualDiscountPercent`, `manualDiscountAmount`, `discountApprovedById`, `discountReason` to SaleItem
- `apps/api/src/modules/sales/sale.service.ts` — handle manual discounts
- `apps/api/src/modules/sales/sale.schema.ts` — update schemas
- `apps/web/features/sales/components/components/NewSaleForm.tsx` — add manual discount input per line item

**After migration:** `cd apps/api && npx prisma migrate dev --name add-manual-sale-discounts`

**Commit:** `feat: add enterprise manual discount system for sales`
**Checkpoint:** `.claude/CHECKPOINT-12-ENTERPRISE-DISCOUNTS.md`

---

### Step 4.5 — Fix Promo Code Search

**What:** Fix promo code search returning "Not Found".

**Files to change:**
- `apps/api/src/modules/promos/promo.repository.ts` — check case sensitivity, active status, date range
- `apps/api/src/modules/promos/promo.service.ts` — ensure search is case-insensitive
- `apps/web/features/sales/components/components/NewSaleForm.tsx` — check search query

**Commit:** `fix: promo code search case sensitivity and filtering`
**Checkpoint:** `.claude/CHECKPOINT-13-PROMO-FIX.md`

---

## PHASE 5 — CRM Enterprise Upgrade

### Step 5.1 — Auto-Create Member + Contact from Sales

**What:** When a sale is created with a phone number, auto-create Member and Contact.

**Files to change:**
- `apps/api/src/modules/sales/sale.service.ts` — after sale creation, find-or-create Member by phone, find-or-create Contact from Member
- `apps/api/src/modules/members/member.repository.ts` — add `findOrCreateByPhone()`
- `apps/api/src/modules/contacts/contact.repository.ts` — add `findOrCreateFromMember()`

**Commit:** `feat: auto-create member and contact from sales phone number`
**Checkpoint:** `.claude/CHECKPOINT-14-AUTO-MEMBER.md`

---

### Step 5.2 — CRM Bug Fixes (batch)

**What:** Fix all CRM bugs in one batch.

**Files to change:**
- `apps/web/features/crm/components/contacts/ContactForm.tsx` — fix padding (16.2)
- `apps/web/features/crm/components/contacts/ContactDetail.tsx` — fix sales activity display (16.3), overview panel (16.4)
- `apps/web/features/crm/components/components/LogActivityDialog.tsx` — merge with ContactCommunication (16.5a)
- `apps/web/features/crm/components/contacts/ContactsPage.tsx` — fix cancel navigation (16.9), company filter as combobox (16.8)
- `apps/web/features/crm/components/contacts/ContactForm.tsx` — ensure tags are addable (16.10)

**Commit:** `fix: CRM contact bugs — padding, activity, overview, navigation, tags`
**Checkpoint:** `.claude/CHECKPOINT-15-CRM-FIXES.md`

---

### Step 5.3 — Investigate and Fix CRM Failures

**What:** Debug and fix task display, deal creation, attachment upload.

**Files to investigate:**
- Task not showing (16.5b): Check `useCreateTask` mutation and query invalidation
- Deal creation fails (16.5c, 19.2): Check required fields, default pipeline existence
- Attachment upload fails (16.5d): Check multer config, file size, storage path

**Commit:** `fix: CRM task display, deal creation, and attachment upload`
**Checkpoint:** `.claude/CHECKPOINT-16-CRM-INVESTIGATE.md`

---

### Step 5.4 — Task Multi-Select + Bulk Delete

**What:** Add row selection and bulk delete to tasks.

**Files to create/change:**
- `apps/web/store/task-selection-store.ts` (new)
- `apps/web/features/crm/components/tasks/TasksPage.tsx` — add checkboxes, bulk delete button
- `apps/api/src/modules/tasks/task.service.ts` — add `bulkDelete()`
- `apps/api/src/modules/tasks/task.controller.ts` — add handler
- `apps/api/src/modules/tasks/task.router.ts` — add `DELETE /tasks/bulk`

Also remove "None" from task priority/assignee options (17.3).

**Commit:** `feat: add task multi-select and bulk delete, remove None option`
**Checkpoint:** `.claude/CHECKPOINT-17-TASK-BULK.md`

---

### Step 5.5 — Default Pipelines on Tenant Creation

**What:** Seed 3 default pipelines when a new tenant is created.

**Files to change:**
- `apps/api/src/modules/pipelines/pipeline.repository.ts` — add `seedDefaultPipelines(tenantId)`
- `apps/api/src/modules/platform/platform.service.ts` — call `seedDefaultPipelines` after tenant creation

**Default pipelines:**
1. **Sales Pipeline** (default): New Lead → Contacted → Qualified → Proposal Sent → Negotiation → Closed Won → Closed Lost
2. **Remarketing Pipeline**: Identified → Re-engaged → Interested → Offer Sent → Converted → Not Interested
3. **Repurchase Pipeline**: Past Customer → Follow-up Sent → Considering → Repeat Purchase → Churned

**Commit:** `feat: seed default pipelines on tenant creation`
**Checkpoint:** `.claude/CHECKPOINT-18-DEFAULT-PIPELINES.md`

---

### Step 5.6 — Pipeline Workflow Automation System

**What:** Build workflow rules that trigger actions when deals move through stages. Platform admin only.

**Files to create/change:**

Schema:
- `apps/api/prisma/schema.prisma` — add `PipelineWorkflow`, `WorkflowRule` models, `WorkflowTrigger`, `WorkflowAction` enums

Backend:
- `apps/api/src/modules/workflows/` (new module):
  - `workflow.repository.ts`
  - `workflow.service.ts`
  - `workflow.controller.ts`
  - `workflow.schema.ts`
  - `workflow.router.ts`
  - `workflow.engine.ts` — executes rules when deals change stage
- `apps/api/src/modules/deals/deal.service.ts` — call workflow engine on stage change

Frontend:
- `apps/web/features/crm/components/workflows/WorkflowEditorPage.tsx` (new) — GitHub Projects-style visual editor
- `apps/web/features/crm/services/workflow.service.ts` (new)
- `apps/web/features/crm/hooks/use-workflows.ts` (new)
- Route: `apps/web/app/[workspace]/(admin)/settings/crm/workflows/page.tsx` (new)
- Sidebar: add "Workflows" item under CRM settings (platform admin only)

**Workflow triggers:** STAGE_ENTER, STAGE_EXIT, DEAL_CREATED, DEAL_WON, DEAL_LOST
**Workflow actions:** CREATE_TASK, SEND_NOTIFICATION, MOVE_STAGE, UPDATE_FIELD, CREATE_ACTIVITY

**After migration:** `cd apps/api && npx prisma migrate dev --name add-pipeline-workflows`

**Commit:** `feat: add pipeline workflow automation system with visual editor`
**Checkpoint:** `.claude/CHECKPOINT-19-WORKFLOWS.md`

---

### Step 5.7 — Deals Plan Gating

**What:** Ensure deals and CRM settings are hidden for Starter plan.

**Files to change:**
- `apps/web/components/layout/sidebar.tsx` — verify Deals gating
- `apps/web/app/[workspace]/(admin)/settings/crm/page.tsx` — add `FeaturePageGuard`
- `apps/web/features/crm/components/deals/DealsKanbanPage.tsx` — add plan check

**Commit:** `fix: gate deals and CRM settings behind sales pipeline feature flag`
**Checkpoint:** `.claude/CHECKPOINT-20-DEALS-GATING.md`

---

## PHASE 6 — Remaining Bug Fixes

### Step 6.1 — Product Form Fixes (batch)

**What:** Fix remaining product form issues.

**Files to change:**
- `apps/web/features/products/components/components/ProductForm.tsx`:
  - 10.3: Add onBlur validation for MRP < CP with "Accept anyway" option
  - 10.13: Rename "Description" to "Product Description" with tooltip
  - 10.17: Add "Select All" checkbox for attributes in VariationsTab
- `apps/api/src/modules/products/product.repository.ts`:
  - 10.18: Add `orderBy: { location: { name: "asc" } }` to locationInventory include
- `apps/api/src/modules/products/product.schema.ts`:
  - 10.19: Add `.max(2147483647)` to stock quantity with friendly error
- `apps/api/src/modules/inventory/inventory.schema.ts`:
  - 10.19: Same max on SetInventorySchema

**Commit:** `fix: product form — MRP validation, description label, select-all, location sort, stock max`
**Checkpoint:** `.claude/CHECKPOINT-21-PRODUCT-FIXES.md`

---

### Step 6.2 — Category Duplicate Handling

**What:** When "category already exists" error, highlight the existing category.

**Files to change:**
- `apps/web/features/products/components/CategoriesPage.tsx` — on 409 error with `existingCategory`, scroll to and highlight that category

**Commit:** `fix: highlight existing category on duplicate error`
**Checkpoint:** `.claude/CHECKPOINT-22-CATEGORY-DUP.md`

---

### Step 6.3 — Discount Bulk Delete

**What:** Add multi-select and bulk delete to discounts.

**Files to change:**
- `apps/web/features/products/components/components/DiscountsTab.tsx` — add checkboxes, bulk delete
- Backend: add bulk delete endpoint if needed

**Commit:** `feat: add discount multi-select and bulk delete`
**Checkpoint:** `.claude/CHECKPOINT-23-DISCOUNT-BULK.md`

---

### Step 6.4 — Location Plan Limit UI

**What:** Show usage counter and disable add button when at limit.

**Files to change:**
- `apps/web/features/locations/components/index.tsx` — show "X of Y locations", disable Add when at limit

**Commit:** `fix: show location usage counter and enforce plan limit in UI`
**Checkpoint:** `.claude/CHECKPOINT-24-LOCATION-LIMIT.md`

---

### Step 6.5 — Sidebar Scroll Fix

**What:** Ensure sidebar scroll position persists on refresh.

**Files to change:**
- `apps/web/hooks/useScrollRestoration.ts` — add MutationObserver to wait for sidebar items before restoring

**Commit:** `fix: improve sidebar scroll restoration timing`
**Checkpoint:** `.claude/CHECKPOINT-25-SIDEBAR-SCROLL.md`

---

### Step 6.6 — Sales PDF Fixes

**What:** Fix PDF layout for many items and long text.

**Files to change:**
- `apps/api/src/modules/sales/receipt/generateReceipt.ts` — handle page breaks, text truncation

**Commit:** `fix: sales receipt PDF layout for many items`
**Checkpoint:** `.claude/CHECKPOINT-26-PDF-FIX.md`

---

### Step 6.7 — Remaining Investigation Items

**What:** Investigate and fix:
- 10.5: Product column view duplicates — check API pagination
- 14.3: Bulk upload error — debug processSaleBulkRows
- N.1: Plan switching — check login response

**Commit:** `fix: investigate and resolve product duplicates, bulk upload, plan switching`
**Checkpoint:** `.claude/CHECKPOINT-27-INVESTIGATION.md`

---

## CHECKPOINT FILE FORMAT

After each commit, create/update a checkpoint file:

```markdown
# Checkpoint XX — [Step Name]

**Commit:** [commit hash]
**Status:** DONE / PARTIAL / BLOCKED
**Tests:** PASS / FAIL (list failures)
**Type check:** PASS / FAIL

## What was done
- [bullet points]

## What's next
- [next step reference]

## Known issues
- [any issues found during this step]
```

---

## FINAL CHECKLIST

After all steps:
- [ ] `cd apps/api && pnpm test:run` — all pass
- [ ] `cd apps/web && pnpm test:run` — all pass
- [ ] `cd apps/api && npx tsc --noEmit` — zero errors
- [ ] `cd apps/web && npx tsc --noEmit` — zero errors
- [ ] Manual UI check of all changed features
- [ ] Create PR with summary of all changes
