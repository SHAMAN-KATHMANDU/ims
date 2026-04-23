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

| Range                                                            | Submodule                                    | Owner module |
| ---------------------------------------------------------------- | -------------------------------------------- | ------------ |
| 0–6                                                              | INVENTORY ▸ Products                         | INVENTORY    |
| 7–10                                                             | INVENTORY ▸ Categories                       | INVENTORY    |
| 11–15                                                            | INVENTORY ▸ Vendors                          | INVENTORY    |
| 16–20                                                            | INVENTORY ▸ Locations                        | INVENTORY    |
| 21–27                                                            | INVENTORY ▸ Transfers                        | INVENTORY    |
| 28–34                                                            | INVENTORY ▸ Bundles                          | INVENTORY    |
| 35–43                                                            | INVENTORY ▸ GiftCards                        | INVENTORY    |
| 44–51                                                            | INVENTORY ▸ Promos                           | INVENTORY    |
| 52–58                                                            | INVENTORY ▸ Collections                      | INVENTORY    |
| 59–63                                                            | INVENTORY ▸ AttributeTypes                   | INVENTORY    |
| 64–71                                                            | INVENTORY ▸ Discounts                        | INVENTORY    |
| (rbac-core fills the remaining ranges as the catalog is written) |                                              |              |
| 511                                                              | SETTINGS.ADMINISTRATOR (sentinel — last bit) | SETTINGS     |

**Rules:**

- Bits are append-only. Never reuse a freed bit.
- `ADMINISTRATOR` is pinned at bit `511` (last byte, last bit) to keep mid-range bits flexible.
- Reservation gaps are intentional; they leave room for future actions in the same submodule.

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
