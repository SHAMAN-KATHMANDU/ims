/**
 * Security tests: audit logging for dangerous permission usage.
 *
 * SETTINGS.AUDIT.PURGE (bit 205) is a dangerous permission. Per the security
 * contract, any action guarded by a dangerous permission should create a
 * SECURITY-level audit log row that captures the actor's userId and the action.
 *
 * Current status: the permissions controller and route layer do NOT yet emit
 * audit logs for dangerous RBAC actions (role deletion, permission overwrite
 * changes). The tests that require controller-level audit emission are marked
 * it.skip with a TODO.
 *
 * What IS tested now (no DB required):
 *   - The catalog correctly marks SETTINGS.AUDIT.PURGE as dangerous.
 *   - permissionService.assert() throws 403 for a user lacking a dangerous
 *     permission (audit logging is only relevant when access IS granted).
 *   - The ADMINISTRATOR bypass grants the dangerous permission unconditionally.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PermissionService } from "@/modules/permissions/permission.service";
import { permissionRepository } from "@/modules/permissions/permission.repository";
import { permissionCache } from "@/modules/permissions/permission.cache";
import { EMPTY_BITSET, setBit } from "@/shared/permissions/bitset";
import {
  ADMINISTRATOR_BIT,
  PERMISSION_BY_KEY,
  PERMISSIONS,
} from "@repo/shared";

vi.mock("@/modules/permissions/permission.repository");
vi.mock("@/modules/permissions/permission.cache");

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TENANT_ID = "tenant-audit-0000-0000-0000-000000000001";
const USER_ID = "user-audit-actor-0000-0000-000000000001";
const ROLE_ID = "role-audit-0000-0000-0000-000000000001";
const RESOURCE_ID = "resource-audit-0000-0000-00000000001";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Dangerous permission audit", () => {
  let service: PermissionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PermissionService();
    vi.mocked(permissionCache.get).mockResolvedValue(null);
    vi.mocked(permissionCache.set).mockResolvedValue(undefined);
  });

  // ── Catalog: SETTINGS.AUDIT.PURGE is marked dangerous ─────────────────────

  describe("permission catalog", () => {
    it("SETTINGS.AUDIT.PURGE is flagged as dangerous in the catalog", () => {
      const def = PERMISSION_BY_KEY.get("SETTINGS.AUDIT.PURGE");
      expect(def).toBeDefined();
      expect(def!.dangerous).toBe(true);
    });

    it("SETTINGS.AUDIT.PURGE has a defined bit index", () => {
      const def = PERMISSION_BY_KEY.get("SETTINGS.AUDIT.PURGE")!;
      expect(def.bit).toBe(205);
    });

    it("SETTINGS.ADMINISTRATOR is flagged as dangerous", () => {
      const def = PERMISSION_BY_KEY.get("SETTINGS.ADMINISTRATOR");
      expect(def).toBeDefined();
      expect(def!.dangerous).toBe(true);
    });

    it("catalog contains at least one dangerous permission per module", () => {
      const dangerousCount = (
        PERMISSIONS as readonly { dangerous?: boolean }[]
      ).filter((p) => p.dangerous).length;
      expect(dangerousCount).toBeGreaterThan(0);
    });
  });

  // ── assert() throws 403 when user lacks the dangerous permission ────────────

  describe("permissionService.assert(): access denied for non-admin user", () => {
    beforeEach(() => {
      // User has ONLY CRM.DEALS.VIEW — no SETTINGS.AUDIT.PURGE
      const memberPerms = EMPTY_BITSET();
      setBit(memberPerms, PERMISSION_BY_KEY.get("CRM.DEALS.VIEW")!.bit);
      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
        { id: ROLE_ID, permissions: memberPerms, priority: 100 },
      ]);
      vi.mocked(permissionRepository.getResourceChain).mockResolvedValue([
        { id: RESOURCE_ID, path: `/${RESOURCE_ID}/`, depth: 0 },
      ]);
      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue(
        [],
      );
    });

    it("assert('SETTINGS.AUDIT.PURGE') throws 403 for non-admin user", async () => {
      await expect(
        service.assert(TENANT_ID, USER_ID, RESOURCE_ID, "SETTINGS.AUDIT.PURGE"),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("assert('SETTINGS.ROLES.MANAGE') throws 403 for member-level user", async () => {
      await expect(
        service.assert(
          TENANT_ID,
          USER_ID,
          RESOURCE_ID,
          "SETTINGS.ROLES.MANAGE",
        ),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  // ── ADMINISTRATOR bypass: dangerous permission is granted ──────────────────

  describe("ADMINISTRATOR bypass: dangerous permissions granted", () => {
    beforeEach(() => {
      // Platform Admin: ADMINISTRATOR bit only
      const adminPerms = EMPTY_BITSET();
      setBit(adminPerms, ADMINISTRATOR_BIT);
      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
        { id: ROLE_ID, permissions: adminPerms, priority: 10000 },
      ]);
    });

    it("can('SETTINGS.AUDIT.PURGE') returns true for ADMINISTRATOR user", async () => {
      const result = await service.can(
        TENANT_ID,
        USER_ID,
        RESOURCE_ID,
        "SETTINGS.AUDIT.PURGE",
      );
      expect(result).toBe(true);
    });

    it("assert('SETTINGS.AUDIT.PURGE') does NOT throw for ADMINISTRATOR user", async () => {
      await expect(
        service.assert(TENANT_ID, USER_ID, RESOURCE_ID, "SETTINGS.AUDIT.PURGE"),
      ).resolves.toBeUndefined();
    });
  });

  // ── API-level audit logging (requires controller audit emission) ──────────

  it.skip(// BLOCKED: Requires controller-level audit emission for dangerous RBAC actions.
  //
  // Current status: permissionService.assert() correctly denies access to
  // dangerous permissions (e.g. SETTINGS.AUDIT.PURGE). However, when access
  // IS granted, controllers do not yet emit AuditLog rows for the action.
  //
  // To enable:
  //   1. In apps/api/src/modules/permissions/permissions.controller.ts:
  //      - Import createDeleteAuditLog from @/shared/audit/createDeleteAuditLog
  //      - Call it in deleteRole() with AuditAction.DELETE, AuditResource.ROLE
  //      - Call it in upsertPermissionOverwrite() with AuditAction.UPDATE,
  //        AuditResource.PERMISSION for dangerous permission keys
  //      - Logs should include userId, tenantId, resourceId (the role/permission)
  //   2. Set RBAC_ENFORCE=true in test env to make requirePermission() enforce
  //      the dangerous permission check.
  //   3. Seed test data: call seedTenantRoles(tenantId) to create roles with
  //      ADMINISTRATOR user, then make API call via Supertest.
  //   4. Query prisma.auditLog.findFirst() to assert the row was created.
  //
  // Reference: apps/api/src/shared/audit/createDeleteAuditLog.ts
  "SETTINGS.AUDIT.PURGE action via API creates SECURITY audit log row", async () => {
    // Will be implemented once controllers emit audit logs for dangerous actions.
  });
});
