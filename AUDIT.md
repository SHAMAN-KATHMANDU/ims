Audit target: Next.js 15 App Router + React 19 + TypeScript 5 + Tailwind v4 + shadcn/ui + TanStack Query v5 +
Zustand v5 + RHF + Zod + Axios SaaS covering CRM, Inventory, Sales, Settings, Messaging, Site Editor, and platform
admin. The codebase is mid-migration from a legacy views/ + root-services/ layout to the features/
clean-architecture standard declared in CLAUDE.md / .claude/rules/frontend-architecture.md.

This report is organized along the six requested dimensions. Every finding is evidence-based (file path cited) and
uses the Problem / Impact / Fix triplet. Findings are prioritized with severity tags: P0 (bleeds users/money), P1
(architectural debt), P2 (quality/consistency).

Expected outcome: a shared, ranked punch list the team can drive against. The "Verification" section at the end
lists concrete commands / greps to confirm each fix.

---

1.  Feature-Level Audit

1.1 Dual architecture (features/ + views/ + root services/) — P1

- Problem. apps/web/features/ holds 27 feature folders (new clean-arch). apps/web/views/ still exists (contains
  media/). apps/web/services/ still holds mediaService.ts. apps/web/hooks/ holds 7 shared hooks — some of them
  domain-specific (useS3DirectUpload.ts → media). app/[workspace]/(admin)/media/page.tsx imports from
  views/media/MediaLibraryPage.tsx while other pages import from features/\*.
- Impact. Two mental models for "where does a feature live?". New code inevitably lands in the wrong place;
  migration keeps stalling. Cross-layer imports make refactors risky.
- Fix. Finish the migration: move views/media/\* → features/media/components/, move services/mediaService.ts →
  features/media/services/media.service.ts, and move hooks/useS3DirectUpload.ts →
  features/media/hooks/use-s3-direct-upload.ts. Delete apps/web/views/ and apps/web/services/ once empty. Add an
  ESLint no-restricted-imports rule blocking those paths going forward.

  1.2 Cross-feature coupling bypassing index.ts — P1

- Problem. features/tenant-site/site-editor/SiteEditorPage.tsx:34 imports blogService from
  @/features/tenant-blog/services/tenant-blog.service (reaches into another feature's internals).
  features/analytics/components/PivotPage.tsx imports useProductsPaginated and
  features/analytics/hooks/use-inventory.ts imports locationKeys from locations.
- Impact. Violates the "only import another feature via its index.ts" rule in frontend-architecture.md. Changes to
  any feature's internals can silently break unrelated features.
- Fix. (a) Add the needed re-exports to each feature's index.ts and update callers, or (b) lift the shared concern
  to apps/web/hooks/ or apps/web/lib/. Add an ESLint rule: no-restricted-imports that forbids
  @/features/_/services/\*\*, @/features/_/hooks/**, @/features/\*/components/** from outside that feature's own tree.

  1.3 State scattered across store/ vs feature hooks — P2

- Problem. apps/web/store/ holds 10+ Zustand stores, most of which are selection stores (products, sales, members,
  trash, etc.) plus auth-store and sidebar-store. Features (e.g., tenant-site editor) also keep state locally. No
  written convention for when a store goes to store/ vs features/<x>/store/.
- Impact. New developers don't know where to put new state. Selection state for products lives at root; selection
  for other surfaces may be re-invented inside a feature.
- Fix. Codify the rule: global UI state (auth, sidebar, theme) → store/. Feature-local UI state (selections, editor
  state, filter drafts) → features/<x>/store/. Move the \*-selection-store.ts files into their owning feature; keep
  only auth-store and sidebar-store at root.

  1.4 Feature-lock leaks at the hook layer — P0

- Problem. feature-lock-architecture.md requires hooks to gate queries on useEnvFeatureFlag so disabled features
  make zero API calls. Spot checks:
  - features/crm/hooks/use-deals.ts correctly gates on EnvFeature.CRM_DEALS.
  - features/crm/hooks/use-contacts.ts, features/messaging/hooks/use-messages.ts, and
    features/crm/hooks/use-pipelines.ts don't gate every query.
  - components/media/MediaLibraryPickerDialog.tsx and hooks/useS3DirectUpload.ts call services/mediaService.ts with
    no feature check.
- Impact. Disabled features still hit the API when mounted in unguarded shells (sidebar quick-action, dialogs).
  Violates the golden rule of the feature-lock architecture and inflates backend load for tenants who don't own the
  feature.
- Fix. For every CRM/Messaging/Media hook: compute const enabled = useEnvFeatureFlag(EnvFeature.X), then enabled:
  enabled && (options?.enabled ?? true) on the useQuery. Add a "feature-lock hook coverage" lint check that greps for
  useQuery/useMutation in features/crm/** and features/messaging/** and fails if the surrounding hook doesn't
  reference useEnvFeatureFlag.

  1.5 Overweight, multi-purpose features — P1

- Problem. features/tenant-site/site-editor/SiteEditorPage.tsx is 3,363 lines.
  features/sales/components/components/NewSaleForm.tsx is 2,264 lines.
  features/automation/components/AutomationForm.tsx is 1,347 lines.
  features/products/components/components/ProductTable.tsx is 1,035 lines. Note the nested components/components/
  folder — a smell.
- Impact. Impossible to unit test without mounting the whole world. Single-line edits trigger whole-feature
  re-render. Code splitting is coarse-grained; dashboards pull editor code even if the editor is never opened. Bus
  factor of 1.
- Fix. Break each monster into orchestration + presentation sub-components (listed under §3.3). Then dynamic(() =>
  import(...)) the editor and the new-sale form at their page boundaries.

  1.6 Redundant nesting: features/<x>/components/components/ — P2

- Problem. Products, sales, transfers, tenants, gift-cards etc. use features/<x>/components/components/ (double
  components/).
- Impact. Developers ritually write components/components/ or get lost navigating. Signals an unfinished refactor.
- Fix. Flatten to features/<x>/components/. Do per-feature in one commit each with a codemod (git mv + a
  ripgrep-based import rewrite). Verify tsc --noEmit after each.

---

2.  Route-Level Audit

2.1 Client-side redirect pages — P1

- Problem. Several page.tsx are "use client" purely to call a router.replace()/useEffect redirect. Examples:
  (admin)/products/categories/page.tsx, (admin)/crm/reports/page.tsx, and 9+ \*/new stubs.
- Impact. Ships a client bundle and a flash of empty content for what should be a pure HTTP 307/308. Breaks
  SEO-friendly crawls. Extra JS execution on every visit.
- Fix. Convert to server components using next/navigation redirect():
  import { redirect } from "next/navigation";
  export default function Page({ params }: { params: { workspace: string } }) {
  redirect(`/${params.workspace}/products/catalog-settings?tab=categories`);
  }

  2.2 Duplicate URL for the same component: /promos vs /products/promos — P1

- Problem. (admin)/promos/page.tsx renders <PromoPage />; (admin)/products/promos/page.tsx renders <PromoPage
  readOnly />. Both are under (admin); both gate on the same PROMO_MANAGEMENT feature; sidebar surfaces both in
  different sections (per ROUTES.md).
- Impact. Two canonical URLs for what is effectively one resource. Deep links diverge; analytics gets split.
  Changing promo UX requires thinking about two entry points.
- Fix. Keep /products/promos as the single read-only catalog entry. Move "manage promos" into a dialog / /promos/new

* /promos/[id]/edit flow gated on the role. Delete the duplicate /promos list page. Update sidebar.

2.3 Settings is a dumping ground (16+ routes across two groups) — P1

- Problem. Settings live in (admin)/settings/{page, ai, automation, automations, crm, crm/workflows,
  site/{blog,collections,design,navigation,offers,pages}} plus (superadmin)/settings/{logs, error-reports,
  password-reset}. Note the confusing pair automation vs automations.
- Impact. No unified nav. Roles and feature flags are enforced inconsistently per page. New team members can't find
  where to add a setting.
- Fix. Introduce a settings layout that owns the left nav and the guard. One route tree: /settings/<section> with a
  layout.tsx that reads a typed SETTINGS_SECTIONS registry and filters by role + feature. Merge automation +
  automations into one route. Platform settings stay under /settings/platform/\* within the same layout — role filter
  hides them from tenant admins.

  2.4 Inconsistent route-level guarding — P0

- Problem. Some routes triple-stack EnvFeaturePageGuard + FeaturePageGuard + AuthGuard (e.g., /promos/page.tsx),
  others guard with none (e.g., /gift-cards/page.tsx, /transfers/page.tsx). CRM sub-routes /crm/companies,
  /crm/companies/[id]/edit don't wrap in FeaturePageGuard(Feature.SALES_PIPELINE) even though sibling /crm/deals does.
- Impact. Plan-gated features bleed through. A user on a lower plan 404s on /crm but can still reach /crm/companies.
  An RBAC escalation or a flag bug lets unauthorized users reach /gift-cards.
- Fix. Add a single (crm) group layout at (admin)/crm/layout.tsx that wraps children in <FeaturePageGuard
  feature={Feature.SALES_PIPELINE}><AuthGuard
  roles={["admin","superAdmin"]}>{children}</AuthGuard></FeaturePageGuard>. Do the same for gift-cards, transfers, and
  every other gated module. Delete per-page guards. ROUTES.md becomes the declarative source; add a unit test that
  asserts every row in ROUTES.md has a matching guard file.

  2.5 Pass-through page files — P2

- Problem. Many 4–7 line pages that just export default function Page() { return <XPage /> } (members, transfers,
  gift-cards new/edit).
- Impact. Not harmful per se, but inconsistency is: some pages are thin, others are fat with fetch logic inside
  page.tsx.
- Fix. Establish: page.tsx is only allowed to (a) read params, (b) run redirect() / notFound(), (c) render a feature
  component. Anything more goes into the feature.

  2.6 "use client" pushed too high — P2

- Problem. Detail pages like /sales/website-orders/[id]/page.tsx are client components even though the shell
  (breadcrumb, header) could render on the server.
- Impact. Larger JS payload, slower TTI, loss of RSC streaming benefits.
- Fix. For each detail page, split into server page.tsx (fetches initial data via service) + client \*ClientView.tsx
  leaf for interactivity.

---

3.  Page & Component Audit

3.1 Twelve near-identical Table implementations — P0

- Problem. ProductTable, SalesTable, ContactTable, TransferTable, TenantTable, GiftCardTable, BundleTable,
  MemberTable, LocationTable, UserTable, ReviewTable, CategoryTable each re-implement: skeleton loader, sort header,
  pagination props wiring, select-all checkbox, empty state, mobile-card fallback, search debouncing. ~11k LOC
  duplicated.
- Impact. Any cross-cutting change (new selection UX, accessibility fix, sticky header) costs 12 identical edits.
  They've already diverged — some have aria-sort, some don't.
- Fix. Build one <DataTable> (use @tanstack/react-table if not already). API: items, columns, renderRow?,
  pagination, sort, selection, renderMobileCard?, emptyState, isLoading. Port two tables first (products + sales) as
  the canonical examples, then delete the rest in a single PR each.

  3.2 55+ hand-rolled search/filter inputs — P1

- Problem. Each table/page re-implements the search input (icon + input + debounce + clear button). Grep finds 55+
  instances across features/.
- Impact. Inconsistent debounce timings (300ms vs 400ms vs 500ms), inconsistent clear-button behavior, inconsistent
  aria-label.
- Fix. components/ui/search-input.tsx with debounceMs, onChange, onClear, ariaLabel. Adopt in the new <DataTable>
  (§3.1) and in page headers.

  3.3 God components (>1000 lines) — P0

- Problem. Seven components exceed 1k lines (§1.5). Worst offender SiteEditorPage.tsx (3,363).
- Impact. Unmanageable rerender graphs, untestable units, impossible to code-split.
- Fix (SiteEditor). Extract: BlockInspector, EditorToolbar, BlockTreePanel, PreviewPane, BlockPalette (the sub-files
  already exist — the monolith duplicates/wraps them) and a useSiteEditorStore Zustand store for cross-component
  state. Fix (NewSaleForm). Move to full RHF, split into CartSection, PaymentSection, ContactSection, PromoSection;
  each reads from useFormContext. Fix (ProductTable). Extract ProductTableRow (memoized), ProductDetailSheet,
  ProductMobileCards.

  3.4 Delete/bulk-action dialogs reinvented — P2

- Problem. ProductDeleteDialog, CategoryDeleteDialog, BulkDeleteLocationsDialog, BulkDeleteUsersDialog,
  BulkChangePasswordDialog, etc. Each hand-rolls loading/success/error. Some use Dialog instead of AlertDialog for
  destructive confirmation (semantic bug).
- Impact. Inconsistent destructive UX (copy, spinner, error toast). Non-destructive semantics on destructive actions
  fails screen-reader announcements.
- Fix. Use the existing components/ui/delete-confirm-dialog.tsx (likely AlertDialog-based) everywhere. Add
  <BulkActionDialog> for multi-row operations (ids, onConfirm, loading, error, optimistic count).

  3.5 Form submit buttons miss loading/disabled patterns — P1

- Problem. ProductForm.tsx:342 disables + text-swaps. NewSaleForm.tsx:2231 and VendorForm.tsx:176 disable with no
  spinner or label change.
- Impact. Users double-click; duplicate POSTs land in the API (relies on backend idempotency which may or may not
  exist per endpoint).
- Fix. <SubmitButton isLoading label="Save" loadingLabel="Saving…" /> primitive, adopted everywhere. Combined with
  server-side idempotency keys, this closes the double-submit hole.

  3.6 Empty / loading / error state inconsistency — P2

- Problem. 143+ inline empty-state patterns. Table skeletons hand-coded per table (hardcoded column counts that
  silently break when a column is added). No consistent error UI on tables — a failed fetch shows blank.
- Fix. Standardize on components/ui/empty.tsx. Add <TableSkeleton rows columns /> to components/ui/skeleton.tsx. Add
  error state to the new <DataTable> returning <ErrorCallout retry={refetch} />.

  3.7 Redundant nested components/ folders — P2

- See §1.6.

---

4.  UI/UX Audit (Granular)

4.1 Visual hierarchy / heading levels — P1

- Problem. features/products/components/CatalogPage.tsx:860, 883 uses <p className="text-2xl font-bold"> as a page
  title — no <h1>. Good counterexample: features/crm/components/CrmDashboardPage.tsx uses <PageHeader>.
- Impact. Screen-reader landmark navigation is broken; SEO crawlers can't determine title; users can't "find by
  heading" in accessibility tools.
- Fix. Mandate <PageHeader title description actions /> for every page's top title. Add a codemod that flips <p
  className="text-2xl font-bold"> → <h1>.

  4.2 Dashboard "card salad" — P2

- Problem. features/analytics/components/SalesRevenuePage.tsx uses ~80 <Card> instances. CRM dashboard stacks four
  metric cards in a row with no hierarchy.
- Impact. Attention is uniformly spread; the user can't tell what's the headline number vs the detail.
- Fix. Reserve cards for (a) single metric tiles in hero row, (b) one container per section. Group related secondary
  metrics inside a single card using dl/dt/dd or grid rows.

  4.3 Spacing is ad-hoc — P2

- Problem. Codebase mixes space-y-4, gap-6, mb-6, py-4 px-3 without a scale. No documented rhythm.
- Fix. Pick and document: page shell space-y-6, card content space-y-4, grouped rows space-y-3, inline gap-2.
  Enforce via a lint rule or a grep check in CI.

  4.4 Icon-only buttons lack aria-label — P1

- Problem. ProductTable.tsx:959–977 has icon-only actions where only some siblings carry aria-label. Editor
  BlockInspector.tsx, BlockTreePanel.tsx, BlockPalette.tsx use raw <button> with no labels.
- Impact. Screen reader hears "button, button, button"; keyboard-only users can't identify actions. WCAG 2.1 1.3.1
  failure.
- Fix. Rule: every <Button size="icon"> / icon-only button must have an aria-label. Add an ESLint rule
  (jsx-a11y/control-has-associated-label) or a custom check in CI.

  4.5 Missing alt on <img> — P1

- Problem. ProductTable.tsx:891 alt=""; ProductDetailSheet.tsx:73,217, ProductPickerField.tsx:177,
  ParticipantAvatar.tsx:35 lack alt. Some are <img> not next/image.
- Impact. Alt=""; means decorative. Product photos and avatars are not decorative — screen readers skip meaningful
  content. WCAG 1.1.1.
- Fix. Populate alt (`Product: ${product.name}` / `${participant.name} avatar`). Replace <img> with next/image where
  CDN serves the asset — also wins LCP.

  4.6 Raw <button> and <div onClick> in editor — P1

- Problem. HeaderFooterInspectors.tsx:576, 957, BlockInspector.tsx:123,130,203,281, BlockTreePanel.tsx:175,192,202,
  BlockPalette.tsx:115 use raw <button>. Likely <div onClick> patterns elsewhere — worth a scan.
- Impact. Inconsistent focus rings / hover / disabled. Not keyboard-reachable if <div> is used. ESLint
  jsx-a11y/no-static-element-interactions would flag these.
- Fix. Replace with <Button variant="ghost" size="sm">. Add/enable jsx-a11y/no-static-element-interactions and
  jsx-a11y/click-events-have-key-events.

  4.7 Form field label coverage — P1

- Problem. Raw Label counts ≈ 434 vs htmlFor= ≈ 236. Gap suggests ~45% of Labels are not programmatically
  associated.
- Impact. Clicking the label doesn't focus the input; screen readers announce labels in the wrong order.
  Accessibility + usability regression.
- Fix. Build <FormField name label description> that composes RHF Controller + shadcn FormField + Label
  htmlFor={name} + FormMessage. Migrate forms one by one. Add lint check: any <Label> without sibling
  htmlFor/<FormField> fails.

  4.8 Color tokens mostly respected, occasional drift — P2

- Problem. No hardcoded text-[#...] / bg-[#...] found (good). But raw bg-green-100 text-green-700 patterns appear in
  status chips alongside bg-primary/10 text-primary.
- Fix. A small <StatusBadge variant="success|warning|info|danger|muted" /> primitive that maps to semantic tokens.
  Replace ~20 ad-hoc uses.

  4.9 Interaction feedback on long-running ops — P2

- Problem. Some mutations don't show optimistic UI or a progress toast. Bulk uploads (§3.4) report "done" only after
  completion with no per-step feedback.
- Fix. Standardize on sonner/useToast for "Saving…" → "Saved ✓" / "Failed ✗ [retry]" pattern. For bulk ops, show a
  progress toast driven by server-sent events or polling with a cap.

---

5.  State & Data Flow

5.1 Dual form state in NewSaleForm — P0

- Problem. NewSaleForm.tsx uses useForm() AND ~20 separate useStates for fields (memberPhone, items, payments,
  promoCode, etc.).
- Impact. RHF reset doesn't clear the useState values. Validation runs against RHF, UI renders from useState.
  Re-renders double per keystroke. Subtle bugs around payment amount / promo code sync.
- Fix. Move every field into RHF. useFieldArray for items/payments. useWatch for derived totals. Keep useState only
  for UI chrome (dropdown open, promo validating spinner). Then delete the ad-hoc setters.

  5.2 Server data mirrored into useState — P1

- Problem. Same file: inventory/inventoryLoading are kept in useState and populated by an imperative fetch (no
  useQuery).
- Impact. No cache dedup across tabs/components; no automatic refetch on focus; stale inventory when a co-worker
  ships a sale in a parallel tab.
- Fix. features/inventory/hooks/use-location-inventory.ts wraps useQuery. NewSaleForm consumes it. Add optimistic
  updates on write. Set staleTime: 30 \* 1000 (inventory changes fast, but sub-30s staleness is fine).

  5.3 Broad invalidation on mutations — P1

- Problem. features/products/hooks/use-products.ts:202-203 invalidates productKeys.all + refetchQueries — this nukes
  every cached product query including all detail views.
- Impact. Every product create refetches the list and every open detail modal. With 5 open modals that's ~6
  refetches per single mutation.
- Fix. invalidateQueries({ queryKey: productKeys.lists() }) only. For the specific detail affected by the mutation,
  call setQueryData(productKeys.detail(id), updated) optimistically. Apply the same audit to use-deals, use-contacts,
  use-sales.

  5.4 Mixed key-factory usage — P2

- Problem. use-products.ts:357 invalidates the literal ["productDiscounts"] even though productDiscountKeys exists
  at line 111.
- Fix. Lint rule: forbid string-literal queryKey arrays outside the \*Keys factory files. Re-run a sweep and fix all
  offenders.

  5.5 Most queries have no staleTime — P1

- Problem. useProductsPaginated and peers have no staleTime. Default is 0 — every tab switch, nav, or mount triggers
  a refetch. Only a few hooks (useDiscountTypes, useDiscountTypesPaginated) set one.
- Impact. A user clicking Products → Sales → Products fires two identical /products requests within 2 seconds.
- Fix. Set defaults at the QueryClient (defaultOptions.queries.staleTime = 2 _ 60 _ 1000). Override per-hook where
  appropriate (inventory → 30s, categories/locations → 10min, auth → Infinity).

  5.6 Feature-flag order-of-operations — P1

- Problem. Pages that gate with FeaturePageGuard still mount the component tree on first render; hooks inside fire
  their queries before the guard rewrites. See features/crm/components/contacts/ContactsPage.tsx.
- Fix. Gate inside the hook (enabled: envFlag && caller.enabled) AND early-return at the page level based on
  useEnvFeatureFlag. Two layers — not either/or.

  5.7 Notifications polling burns battery — P1

- Problem. features/crm/hooks/use-notifications.ts uses refetchInterval: 60_000 unconditionally.
- Impact. ~1,440 requests/day/user, including when the tab is hidden. Users with 10 tabs pay 10x. Also contributes
  to feature-lock violations if CRM is disabled.
- Fix. Only poll when document.visibilityState === "visible". Pause when hidden using refetchIntervalInBackground:
  false. Increase base interval to 2–5min. Consider SSE/WebSocket if truly needed.

  5.8 Zustand: selectors not consistently used — P2

- Problem. product-selection-store.ts exports selectors (selectSelectedProductIds, etc.), but
  features/products/components/index.tsx:47 reads the store as useProductSelectionStore((state) => state.setProducts)
  inline instead of an exported selector.
- Impact. Any state change in the store triggers re-render for consumers that read more than they need.
- Fix. Export selectSetProducts and peers. Enforce: lint rule banning inline store selectors (accept only imported
  select\*).

  5.9 Axios interceptor + per-mutation toasts = duplicates — P2

- Problem. lib/axios.ts:76-118 toasts all non-401 errors globally; hooks also toast their own error in onError. One
  failure → two toasts.
- Fix. Add a per-request escape hatch: api.post(url, data, { skipGlobalErrorToast: true }). Interceptor skips the
  toast when flag is set. Use it on all mutations that handle their own error UX.

  5.10 401 handling path — P1

- Problem. Worth confirming: does lib/axios.ts redirect to /login on 401 and clear auth store? If the refresh-token
  flow exists, is the queue / retry race-free?
- Fix. Audit the interceptor. Standard pattern: single-flight refresh, queue concurrent 401s, on refresh failure
  clear auth-store and router.replace('/login').

---

6.  Performance & Scalability

6.1 No list virtualization — P1

- Problem. @tanstack/react-virtual not used anywhere (rg "react-virtual" apps/web comes up empty). Product/sales
  tables render 50–100+ rows directly.
- Impact. ~50-100ms render spikes, scroll jank, ~500KB DOM overhead for a 100-row table.
- Fix. Bake virtualization into the new <DataTable> (§3.1). Use windowed rendering when items.length > 50.

  6.2 No next/dynamic for heavy features — P1

- Problem. rg "next/dynamic" apps/web — needs confirming, but site-editor (3,363 LOC) and analytics charts likely
  load eagerly for every admin user.
- Fix. const SiteEditorPage = dynamic(() => import("@/features/tenant-site/site-editor/SiteEditorPage"), { loading:
  () => <PageSkeleton />, ssr: false }). Same for analytics pages, new-sale form, automation builder.

  6.3 Unmemoized row components — P1

- Problem. ProductTable rows re-render on every parent render because callbacks are new function references each
  time.
- Fix. Extract ProductTableRow = React.memo(...). Stabilize all row callbacks (onEdit, onDelete, onSelect) with
  useCallback at the page level or pull them from the Zustand selection store directly inside the row.

  6.4 Deprecated useProducts() still exported — P2

- Problem. use-products.ts:156-161 flagged @deprecated in favor of useProductsPaginated. Still exported; callers
  exist.
- Impact. Any surviving caller fetches the unpaginated list — O(all products).
- Fix. Ripgrep callers, migrate them, delete the export.

  6.5 Eager-loaded chart / rich-text libs — P2

- Problem. Likely recharts or similar in the dashboard bundle on first paint. Worth confirming with next build
  --profile.
- Fix. Route-split with dynamic(). Pre-render skeleton cards on the server; lazy-load the chart bundles on the
  client.

  6.6 Axios base-URL and timeouts — P2

- Problem. Confirm single Axios instance (no shadow axios.create in sub-features). Confirm sane timeout so a hung
  backend doesn't keep a spinner forever.
- Fix. Grep rg "axios.create" apps/web → should be exactly 1 hit (in lib/axios.ts). Ensure timeout: 30_000 on the
  instance; per-request overrides for long uploads.

  6.7 Client components near the root — P2

- Problem. app/[workspace]/(admin)/layout.tsx and many page.tsx are likely client components. Every child is client
  by default then.
- Fix. Audit with rg -l "^\"use client\"" apps/web/app | wc -l. For each hit, check whether the file actually needs
  hooks. Move guards into a small client leaf; keep the shell server-side.

---

Prioritized Remediation Sequence

1.  P0 — feature-lock leaks (§1.4, §2.4): gate every CRM/Messaging/Media hook + add (crm) / (gift-cards) /
    (transfers) layout guards. Ship first because it bleeds API calls and potentially PII.
2.  P0 — kill dual form state in NewSaleForm (§5.1): one full day, unblocks double-submit + stale promo bugs.
3.  P0 — extract <DataTable> (§3.1): reference port products + sales in one week; then delete remaining 10 tables
    over two sprints.
4.  P1 — finish features/views/services migration (§1.1, §1.2) + add ESLint no-restricted-imports guardrails.
5.  P1 — server redirects (§2.1) and settings consolidation (§2.3).
6.  P1 — TanStack Query hygiene: defaults on QueryClient, scope-tight invalidations, notifications polling fix (§5.3,
    §5.5, §5.7).
7.  P1 — god-component splits (SiteEditor, NewSaleForm, AutomationForm — §3.3) with dynamic() boundaries (§6.2).
8.  P1 — accessibility sweep: PageHeader, aria-label, alt, FormField (§4.1, §4.4, §4.5, §4.7).
9.  P2 — everything else: spacing tokens, StatusBadge, SubmitButton, selector hygiene, axios toast flag, deprecated
    useProducts removal.

Critical files to modify (non-exhaustive)

- apps/web/lib/axios.ts — 401 / toast-flag audit (§5.9, §5.10)
- apps/web/lib/query-client.ts (or the QueryClient singleton) — default staleTime (§5.5)
- apps/web/app/[workspace]/(admin)/crm/layout.tsx (new) — single guard (§2.4)
- apps/web/app/[workspace]/(admin)/{promos,products/promos}/page.tsx — dedupe (§2.2)
- apps/web/app/[workspace]/(admin)/settings/layout.tsx (new) — settings registry (§2.3)
- apps/web/components/ui/{data-table,search-input,submit-button,form-field,status-badge}.tsx (new or extended) —
  primitives (§3.1, §3.2, §3.5, §4.7, §4.8)
- apps/web/features/products/hooks/use-products.ts — scoped invalidation + staleTime (§5.3, §5.5), remove deprecated
  useProducts (§6.4)
- apps/web/features/crm/hooks/{use-contacts,use-pipelines,use-notifications,use-workflows}.ts — feature-lock hook
  gating + polling fix (§1.4, §5.7)
- apps/web/features/sales/components/components/NewSaleForm.tsx — RHF migration + useLocationInventory (§5.1, §5.2)
- apps/web/features/tenant-site/site-editor/SiteEditorPage.tsx — split + dynamic() (§3.3, §6.2)
- apps/web/views/ + apps/web/services/mediaService.ts — migrate and delete (§1.1)
- apps/web/store/\*-selection-store.ts — move into owning features (§1.3)

Reusable utilities already in the codebase (prefer extending over creating)

- components/ui/empty.tsx — empty states (extend; don't re-invent per page) (§3.6)
- components/ui/delete-confirm-dialog.tsx — adopt everywhere destructive (§3.4)
- components/ui/data-table-pagination.tsx — already accessible; wire into new <DataTable> (§3.1)
- components/layout/page-header.tsx — enforce on every page (§4.1)
- features/flags/use-feature-flag.ts + EnvFeature from @repo/shared — gate hooks (§1.4)
- lib/api-error.ts handleApiError() — use in every service catch block

Verification

After each batch of fixes, run from apps/web/:

# Type + lint

npx tsc --noEmit
pnpm lint

# Tests

pnpm test -- --run
pnpm --filter @apps/web test -- --run

# Feature-lock coverage (should return 0 offenders after §1.4)

rg -n "useQuery\(|useMutation\(" features/crm features/messaging | rg -v "useEnvFeatureFlag\|enabled:"

     │ pnpm test -- --run                                                                                            │
     │ pnpm --filter @apps/web test -- --run                                                                         │
     │                                                                                                               │
     │ # Feature-lock coverage (should return 0 offenders after §1.4)                                                │
     │ rg -n "useQuery\(|useMutation\(" features/crm features/messaging | rg -v "useEnvFeatureFlag\|enabled:"        │
     │                                                                                                               │
     │ # Cross-feature internal imports (should be 0 after §1.2)                                                     │
     │ rg -n 'from "@/features/[a-z-]+/(components|hooks|services)/' apps/web/features | rg -v '/index\.ts"'         │
     │                                                                                                               │
     │ # Legacy views/services drift (should be 0 after §1.1)                                                        │
     │ find apps/web/views -type f                                                                                   │
     │ find apps/web/services -type f                                                                                │
     │                                                                                                               │
     │ # Dup tables (should drop from 12 → 2 after §3.1)                                                             │
     │ rg -l "function .*Table\b" apps/web/features apps/web/views                                                   │
     │                                                                                                               │
     │ # Route-level guard audit (every gated row in ROUTES.md must match a guard)                                   │
     │ # Manual PR-review checklist; formal via a small node script later.                                           │
     │                                                                                                               │
     │ # E2E smoke                                                                                                   │
     │ pnpm --filter @apps/web exec playwright test --project=chromium                                               │
     │                                                                                                               │
     │ Manual verification for UI changes (non-negotiable per CLAUDE.md):                                            │
     │                                                                                                               │
     │ 1. pnpm --filter @apps/web dev, open the app, walk one role per group: user, admin, superAdmin.               │
     │ 2. For each role, hit sidebar → every reachable page. Confirm: no flash of content on redirects; no console   │
     │ errors; gated pages 404 cleanly when flag is off.                                                             │
     │ 3. Products and Sales tables: sort, paginate, search, select-all, mobile width — verify the new <DataTable>   │
     │ parity.                                                                                                       │
     │ 4. NewSaleForm: submit, reset, double-click guard, promo flow, offline inventory — confirm no stale inventory │
     │  and no duplicate POSTs.                                                                                      │
     │ 5. Lighthouse pass on dashboard, products, and site-editor — target a11y ≥ 95, best practices ≥ 95.
