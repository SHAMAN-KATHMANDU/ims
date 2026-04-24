/**
 * Security tests: cross-tenant isolation for the RBAC permission system.
 *
 * Verifies that PermissionService propagates errors when asked to resolve a
 * resource that does not belong to the requesting tenant (service-level,
 * mocked repository — no DB required).
 *
 * HTTP endpoint tests (which require two real seeded tenants) are grouped in a
 * describe.skip block with a TODO pointing to seedTenantRoles.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PermissionService } from "@/modules/permissions/permission.service";
import { permissionRepository } from "@/modules/permissions/permission.repository";
import { permissionCache } from "@/modules/permissions/permission.cache";
import { EMPTY_BITSET, setBit } from "@/shared/permissions/bitset";
import { ADMINISTRATOR_BIT } from "@repo/shared/src/permissions/catalog";

vi.mock("@/modules/permissions/permission.repository");
vi.mock("@/modules/permissions/permission.cache");

// ─── Fixtures ───────────────────────────────────────────────────────────────

const TENANT_A = "tenant-aaaa-0000-0000-0000-000000000001";
const TENANT_B = "tenant-bbbb-0000-0000-0000-000000000002";
const USER_A = "user-aaaa-0000-0000-0000-000000000001";
const ROLE_A = "role-aaaa-0000-0000-0000-000000000001";

// A resource that belongs to tenant-B (attacker tries to resolve it with tenant-A creds)
const RESOURCE_B = "resource-bbbb-0000-0000-0000-000000000001";
const RESOURCE_A = "resource-aaaa-0000-0000-0000-000000000001";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Cross-tenant isolation: PermissionService", () => {
  let service: PermissionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PermissionService();
    vi.mocked(permissionCache.get).mockResolvedValue(null);
    vi.mocked(permissionCache.set).mockResolvedValue(undefined);
  });

  // ── getEffectivePermissions ────────────────────────────────────────────────

  describe("getEffectivePermissions: cross-tenant resource", () => {
    it("propagates 'not found' error when the resource belongs to another tenant", async () => {
      const rolePerms = EMPTY_BITSET();
      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
        { id: ROLE_A, permissions: rolePerms, priority: 100 },
      ]);

      // Simulate what the repository does when the resource cannot be found
      // within the tenant-A scope (or at all): throws "Resource X not found".
      vi.mocked(permissionRepository.getResourceChain).mockRejectedValue(
        new Error(`Resource ${RESOURCE_B} not found`),
      );

      await expect(
        service.getEffectivePermissions(TENANT_A, USER_A, RESOURCE_B),
      ).rejects.toThrow(/not found/i);
    });

    it("getResourceChain receives the correct (tenantId, resourceId) pair", async () => {
      const rolePerms = EMPTY_BITSET();
      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
        { id: ROLE_A, permissions: rolePerms, priority: 100 },
      ]);
      vi.mocked(permissionRepository.getResourceChain).mockResolvedValue([
        { id: RESOURCE_A, path: `/${RESOURCE_A}/`, depth: 0 },
      ]);
      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue(
        [],
      );

      await service.getEffectivePermissions(TENANT_A, USER_A, RESOURCE_A);

      expect(permissionRepository.getResourceChain).toHaveBeenCalledWith(
        TENANT_A,
        RESOURCE_A,
      );
    });
  });

  // ── ADMINISTRATOR short-circuit ───────────────────────────────────────────

  describe("ADMINISTRATOR short-circuit", () => {
    it("short-circuits before resource chain lookup when ADMINISTRATOR bit is set", async () => {
      const adminPerms = EMPTY_BITSET();
      setBit(adminPerms, ADMINISTRATOR_BIT);
      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
        { id: ROLE_A, permissions: adminPerms, priority: 10000 },
      ]);

      // Even if the resourceId belongs to tenant-B, the ADMINISTRATOR path
      // never calls getResourceChain — it returns immediately.
      await service.getEffectivePermissions(TENANT_A, USER_A, RESOURCE_B);

      expect(permissionRepository.getResourceChain).not.toHaveBeenCalled();
      expect(permissionRepository.getOverwritesForChain).not.toHaveBeenCalled();
    });
  });

  // ── bulkResolve ───────────────────────────────────────────────────────────

  describe("bulkResolve: cross-tenant resourceIds", () => {
    it("propagates error when any resourceId belongs to another tenant", async () => {
      const rolePerms = EMPTY_BITSET();
      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
        { id: ROLE_A, permissions: rolePerms, priority: 100 },
      ]);
      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue(
        [],
      );

      vi.mocked(permissionRepository.getResourceChain).mockImplementation(
        async (_tenantId: string, resourceId: string) => {
          if (resourceId === RESOURCE_A) {
            return [{ id: RESOURCE_A, path: `/${RESOURCE_A}/`, depth: 0 }];
          }
          throw new Error(`Resource ${resourceId} not found`);
        },
      );

      await expect(
        service.bulkResolve(TENANT_A, USER_A, [RESOURCE_A, RESOURCE_B]),
      ).rejects.toThrow(/not found/i);
    });

    it("succeeds when all resourceIds belong to the same tenant", async () => {
      const rolePerms = EMPTY_BITSET();
      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
        { id: ROLE_A, permissions: rolePerms, priority: 100 },
      ]);
      vi.mocked(permissionRepository.getResourceChain).mockResolvedValue([
        { id: RESOURCE_A, path: `/${RESOURCE_A}/`, depth: 0 },
      ]);
      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue(
        [],
      );

      const result = await service.bulkResolve(TENANT_A, USER_A, [RESOURCE_A]);

      expect(result.size).toBe(1);
      expect(result.has(RESOURCE_A)).toBe(true);
    });

    it("getUserRoles receives the correct tenantId (not a cross-tenant one)", async () => {
      const rolePerms = EMPTY_BITSET();
      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
        { id: ROLE_A, permissions: rolePerms, priority: 100 },
      ]);
      vi.mocked(permissionRepository.getResourceChain).mockResolvedValue([
        { id: RESOURCE_A, path: `/${RESOURCE_A}/`, depth: 0 },
      ]);
      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue(
        [],
      );

      await service.bulkResolve(TENANT_A, USER_A, [RESOURCE_A]);

      expect(permissionRepository.getUserRoles).toHaveBeenCalledWith(
        TENANT_A,
        USER_A,
      );
      expect(permissionRepository.getUserRoles).not.toHaveBeenCalledWith(
        TENANT_B,
        expect.anything(),
      );
    });
  });

  // ── HTTP endpoint cross-tenant tests (DB-backed) ──────────────────────────

  describe.skip("HTTP endpoints: cross-tenant IDOR (requires real DB + seedTenantRoles)", () => {
    /**
     * TODO: Enable this describe block once:
     *   1. A test DB with the RBAC schema migration is set up.
     *   2. seedTenantRoles() from apps/api/prisma/scripts/seed-scoped-rbac.ts
     *      is called for two distinct tenants (A and B) in beforeAll.
     *   3. Resources R_A and R_B, and roles ROLE_A and ROLE_B, are seeded
     *      in their respective tenants.
     *   4. A valid JWT is created for an admin user in tenant-A.
     *
     * Expected assertions once enabled:
     *   GET /api/v1/permissions/me/effective?resourceId=<R_B> → 404 or 403
     *   PATCH /api/v1/roles/<ROLE_B>  → 404
     *   POST /api/v1/permissions/me/bulk-resolve { resourceIds: [R_A, R_B] }
     *     → only R_A appears in the result map
     */

    it.todo(
      "GET /permissions/me/effective with tenant-B resourceId returns 404 or 403",
    );

    it.todo("PATCH /roles/<tenant-B roleId> returns 404 for tenant-A admin");

    it.todo(
      "bulk-resolve with mixed-tenant resourceIds includes only tenant-A results",
    );
  });
});
