# RBAC Contract — Phase 1

This file is the **shared contract** between Phase 1 agents (rbac-schema, rbac-core, rbac-api, rbac-hooks). The full plan lives at `~/.claude/plans/you-are-a-senior-atomic-deer.md`. This file captures the decisions agents make as they work so the next phase reads ground truth.

**Single writer per section.** Editing rules are listed in each section header. If you need a decision that isn't here yet, `SendMessage` the owning agent — don't guess.

---

## 1. ResourceType enum · _owner: rbac-schema_

The canonical list of `ResourceType` values goes here once finalized. Other agents read this; only rbac-schema writes it.

**Final enum (shipped in migration 20260423182522):**

- `WORKSPACE`
- `PRODUCT`, `CATEGORY`, `VENDOR`, `LOCATION`, `TRANSFER`, `BUNDLE`, `GIFT_CARD`, `PROMO`, `COLLECTION`, `ATTRIBUTE_TYPE`, `DISCOUNT`
- `SALE`, `WEBSITE_ORDER`, `ABANDONED_CART`
- `CONTACT`, `COMPANY`, `LEAD`, `DEAL`, `PIPELINE`, `WORKFLOW`, `TASK`, `ACTIVITY`, `AUTOMATION`, `REMARKETING_CAMPAIGN`, `CONTACT_NOTE`
- `BLOG_POST`, `PAGE`, `SITE`, `MEDIA`, `REVIEW`, `NAV_MENU`
- `REPORT`, `DASHBOARD`, `CUSTOM_REPORT`
- `USER`, `ROLE`, `MEMBER`, `AUDIT_LOG`, `TRASH_ITEM`, `AI_SETTING`, `WEBHOOK`, `API_KEY`, `INTEGRATION`

**Database type:** `resource_type` (PostgreSQL enum, 43 values total)
**Prisma enum:** `ResourceType` in `apps/api/prisma/schema.prisma`

---

## 2. Prisma model field names · _owner: rbac-schema_

Locks the JS field names other agents must use when constructing repository calls. All shipped in migration 20260423182522.

| Model                   | Prisma name           | DB table                | Key fields (JS names)                                                                                                                                                                 |
| ----------------------- | --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RbacRole**            | `RbacRole`            | `rbac_roles`            | `id`, `tenantId`, `name`, `priority`, `permissions` (Bytes, fixed 64), `isSystem`, `color`, `createdAt`, `updatedAt`                                                                  |
| **UserRole**            | `UserRole`            | `user_roles`            | `userId`, `roleId`, `tenantId`, `assignedAt`, `assignedBy`                                                                                                                            |
| **Resource**            | `Resource`            | `resources`             | `id`, `tenantId`, `type` (ResourceType enum), `externalId`, `parentId`, `path`, `depth`, `createdAt`                                                                                  |
| **PermissionOverwrite** | `PermissionOverwrite` | `permission_overwrites` | `id`, `tenantId`, `resourceId`, `subjectType` (OverwriteSubjectType: ROLE \| USER), `roleId`, `userId`, `allow` (Bytes, fixed 64), `deny` (Bytes, fixed 64), `createdAt`, `updatedAt` |

**Important notes:**

- `tenantId` is denormalized on every row for fast tenant-scoped queries.
- `permissions`, `allow`, `deny` are **fixed-length 64-byte BYTEA** columns (enforced by CHECK constraint).
- `PermissionOverwrite` has **XOR constraint**: exactly one of `roleId` or `userId` must be set.
- Partial unique indexes enforce uniqueness per subject type (role overwrites separate from user overwrites).
- `RbacRole` (not `Role`) to avoid conflict with legacy `Role` enum on `User.role`.

---

## 3. Permission catalog bit-index reservation · _owner: rbac-core_

The catalog source of truth lives at `packages/shared/src/permissions/catalog.ts`. This section records **bit-range reservations per submodule** so other agents can sanity-check without grepping the full file. Append-only.

| Range   | Submodule                   | Count | Module    |
| ------- | --------------------------- | ----- | --------- |
| 0–6     | INVENTORY ▸ Products        | 7     | INVENTORY |
| 7–10    | INVENTORY ▸ Categories      | 4     | INVENTORY |
| 11–15   | INVENTORY ▸ Vendors         | 5     | INVENTORY |
| 16–20   | INVENTORY ▸ Locations       | 5     | INVENTORY |
| 21–27   | INVENTORY ▸ Transfers       | 7     | INVENTORY |
| 28–32   | INVENTORY ▸ Bundles         | 5     | INVENTORY |
| 33–39   | INVENTORY ▸ Gift Cards      | 7     | INVENTORY |
| 40–45   | INVENTORY ▸ Promos          | 6     | INVENTORY |
| 46–50   | INVENTORY ▸ Collections     | 5     | INVENTORY |
| 51–54   | INVENTORY ▸ Attribute Types | 4     | INVENTORY |
| 55–59   | INVENTORY ▸ Discounts       | 5     | INVENTORY |
| 60–68   | SALES ▸ Sales               | 9     | SALES     |
| 69–73   | SALES ▸ Website Orders      | 5     | SALES     |
| 74–75   | SALES ▸ Abandoned Carts     | 2     | SALES     |
| 76–84   | CRM ▸ Contacts              | 9     | CRM       |
| 85–89   | CRM ▸ Companies             | 5     | CRM       |
| 90–97   | CRM ▸ Leads                 | 8     | CRM       |
| 98–106  | CRM ▸ Deals                 | 9     | CRM       |
| 107–110 | CRM ▸ Pipelines             | 4     | CRM       |
| 111–116 | CRM ▸ Workflows             | 6     | CRM       |
| 117–123 | CRM ▸ Tasks                 | 7     | CRM       |
| 124–127 | CRM ▸ Activities            | 4     | CRM       |
| 128–134 | CRM ▸ Automations           | 7     | CRM       |
| 135–138 | CRM ▸ Remarketing           | 4     | CRM       |
| 139–142 | CRM ▸ Contact Notes         | 4     | CRM       |
| 143–147 | WEBSITE ▸ Blog              | 5     | WEBSITE   |
| 148–152 | WEBSITE ▸ Pages             | 5     | WEBSITE   |
| 153–155 | WEBSITE ▸ Site              | 3     | WEBSITE   |
| 156–160 | WEBSITE ▸ Media             | 5     | WEBSITE   |
| 161–165 | WEBSITE ▸ Reviews           | 5     | WEBSITE   |
| 166–169 | WEBSITE ▸ Nav Menus         | 4     | WEBSITE   |
| 170–172 | REPORTS ▸ Analytics         | 3     | REPORTS   |
| 173–177 | REPORTS ▸ Dashboards        | 5     | REPORTS   |
| 178–183 | REPORTS ▸ Custom Reports    | 6     | REPORTS   |
| 184–189 | SETTINGS ▸ Users            | 6     | SETTINGS  |
| 190–195 | SETTINGS ▸ Roles            | 6     | SETTINGS  |
| 196–199 | SETTINGS ▸ Members          | 4     | SETTINGS  |
| 200–202 | SETTINGS ▸ Tenant           | 3     | SETTINGS  |
| 203–205 | SETTINGS ▸ Audit            | 3     | SETTINGS  |
| 206–208 | SETTINGS ▸ Trash            | 3     | SETTINGS  |
| 209–211 | SETTINGS ▸ Error Reports    | 3     | SETTINGS  |
| 212–215 | SETTINGS ▸ Domains          | 4     | SETTINGS  |
| 216–217 | SETTINGS ▸ Notifications    | 2     | SETTINGS  |
| 218–221 | SETTINGS ▸ Messaging        | 4     | SETTINGS  |
| 222–227 | SETTINGS ▸ Webhooks         | 6     | SETTINGS  |
| 228–231 | SETTINGS ▸ API Access       | 4     | SETTINGS  |
| 232–234 | SETTINGS ▸ Integrations     | 3     | SETTINGS  |
| 235–236 | SETTINGS ▸ AI Settings      | 2     | SETTINGS  |
| 511     | SETTINGS ▸ ADMINISTRATOR    | 1     | SETTINGS  |

**Summary: 237 permissions across 6 modules, 59 submodules. Bits 0–236 and 511 allocated; 237–510 reserved for future expansion.**

**Rules:**

- Bits are append-only. Never reuse or reorder.
- `ADMINISTRATOR` (bit 511) is pinned at the last bit to keep mid-range flexible.
- Gaps (237–510) reserved for Phase 2 expansion without schema changes.

---

## 4. Bitset wire format · _owner: rbac-core_

- Postgres column type: `BYTEA`, fixed length **64 bytes** (CHECK constraint enforced by rbac-schema).
- Prisma type: `Bytes`.
- JS in-memory: `Buffer` (Node `Buffer`) — `Uint8Array` is acceptable but Buffer is preferred for ergonomic ops.
- JSON wire format: **base64 string**. Never serialize as decimal/hex string — too easy to silently truncate.
- Bit numbering: bit `n` lives in byte `n >> 3`, mask `1 << (n & 7)` (LSB-first inside each byte).
- Helpers: `hasBit, setBit, clearBit, orBitset, andNotBitset, toWire, fromWire, hasPermission(buf, key)` from `apps/api/src/shared/permissions/bitset.ts`.

---

## 5. Resource auto-creation hook contract · _owner: rbac-hooks_

For every business model created via Prisma, the hook emits a `Resource` row in the same transaction. The mapping (`Prisma model → ResourceType + parent locator`) is owned by rbac-hooks and recorded here once finalized.

**Final mapping (rbac-hooks Phase 1 — work in progress, coordinate with rbac-schema for complete list):**

| Prisma model | ResourceType | Parent locator                                  | Notes                                   |
| ------------ | ------------ | ----------------------------------------------- | --------------------------------------- |
| Product      | PRODUCT      | workspace                                       | Inventory model                         |
| Category     | CATEGORY     | workspace                                       | Inventory model                         |
| Vendor       | VENDOR       | workspace                                       | Inventory model                         |
| Location     | LOCATION     | workspace                                       | Inventory model                         |
| Transfer     | TRANSFER     | workspace                                       | Inventory model                         |
| Sale         | SALE         | workspace                                       | Commerce model                          |
| Deal         | DEAL         | pipeline (if pipelineId set; else workspace)    | CRM model; may be nested under Pipeline |
| Contact      | CONTACT      | workspace                                       | CRM model                               |
| Lead         | LEAD         | workspace                                       | CRM model                               |
| Pipeline     | PIPELINE     | workspace                                       | CRM model                               |
| Workflow     | WORKFLOW     | workspace                                       | CRM model                               |
| Task         | TASK         | workspace                                       | CRM model                               |
| Activity     | ACTIVITY     | deal (if set); contact (if set); else workspace | CRM model; multi-parent capable         |
| ContactNote  | CONTACT_NOTE | contact                                         | CRM model; child of Contact             |

**Parent Hierarchy:**

- **WORKSPACE** is the root Resource for each tenant (created lazily on first entity creation).
- Most entities are direct children of WORKSPACE.
- **Deal** may be nested under **Pipeline** (when pipelineId is set).
- **Activity** may be nested under **Deal**, **Contact**, or default to **WORKSPACE**.
- **ContactNote** is always a child of **Contact**.

**Implementation Status:**

- Hook skeleton in `apps/api/src/config/prisma-extensions/resource-hook.ts` (work in progress).
- Parent locator functions marked TODO pending schema finalization from rbac-schema.
- Lazy WORKSPACE Resource creation implemented as idempotent upsert.
- Coordinate with rbac-core on when/how to populate resources during Phase 1 backfill.

---

## 6. Open questions (in flight)

Add a row when you `SendMessage` a question; remove when answered. Format:
`[asker → asked] question — status (open|answered)`.

- (none yet)

---

## 7. System role seed mappings · _owner: rbac-core_

Maps the legacy `User.role` enum to a system Role with a precomputed bitset, used by the migration backfill.

| Legacy          | New role name  | priority | Bitset rule                                                                                                                                                                                      |
| --------------- | -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `platformAdmin` | Platform Admin | 10000    | only `ADMINISTRATOR` bit set                                                                                                                                                                     |
| `superAdmin`    | Super Admin    | 1000     | only `ADMINISTRATOR` bit set                                                                                                                                                                     |
| `admin`         | Admin          | 900      | every bit _except_ dangerous SETTINGS perms (`USERS.FORCE_LOGOUT`, `AUDIT.PURGE`, `WEBHOOKS.ROTATE_SECRET`, `API_ACCESS.ROTATE_KEY`, `TENANT.UPDATE_PLAN`, `MEMBERS.REVOKE`) and `ADMINISTRATOR` |
| `user`          | Member         | 100      | every `*.VIEW` bit only                                                                                                                                                                          |

All system roles have `isSystem = true`. Only the catalog declares which bits exist; the seed script computes the bitset by filtering the catalog.

---

## 8. Cross-talk etiquette

- Refer to peers by **agent name** (`rbac-schema`, `rbac-core`, `rbac-api`, `rbac-hooks`) — never by UUID.
- Keep messages short and specific: "What's the final name for the `permission_overwrites.subject_type` column? My migration uses `subjectType` mapped via `@map`; want to confirm before I generate."
- When you decide something that other agents need to know, **update this file in your worktree** under your owned section, then ping the relevant peers.
- The coordinator merges worktrees at the end of the phase; merge conflicts on this file are resolved by the section's owner.
