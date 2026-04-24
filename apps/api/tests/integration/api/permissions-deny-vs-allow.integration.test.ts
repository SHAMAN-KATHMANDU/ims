/**
 * Integration tests: deny vs. allow semantics in the RBAC resolution engine.
 *
 * Per RBAC_CONTRACT.md §3, the per-overwrite formula is:
 *   perms = (perms AND_NOT deny) OR allow
 *
 * Applied sequentially per overwrite entry, this means:
 *   1. deny bits are cleared first
 *   2. allow bits are then OR-ed in
 *
 * Consequently, if a single overwrite entry has BOTH allow=BIT and deny=BIT,
 * the bit ends up SET (allow wins at the same overwrite level).
 *
 * These tests verify that invariant and related edge-cases with mocked
 * repository/cache — no DB required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PermissionService } from "@/modules/permissions/permission.service";
import { permissionRepository } from "@/modules/permissions/permission.repository";
import { permissionCache } from "@/modules/permissions/permission.cache";
import { EMPTY_BITSET, setBit } from "@/shared/permissions/bitset";
import { PERMISSION_BY_KEY } from "@repo/shared";

vi.mock("@/modules/permissions/permission.repository");
vi.mock("@/modules/permissions/permission.cache");

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TENANT_ID = "tenant-deny-allow-000-0000-000000000001";
const USER_ID = "user-deny-allow-0000-0000-000000000001";
const ROLE_ID = "role-deny-allow-0000-0000-000000000001";
const RESOURCE_ID = "resource-deny-allow-0000-00000000001";

const BIT = (key: string) => PERMISSION_BY_KEY.get(key)!.bit;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Deny vs. allow semantics: (perms AND_NOT deny) OR allow", () => {
  let service: PermissionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PermissionService();
    vi.mocked(permissionCache.get).mockResolvedValue(null);
    vi.mocked(permissionCache.set).mockResolvedValue(undefined);

    // User has a role with CRM.DEALS.VIEW in base mask
    const rolePerms = EMPTY_BITSET();
    setBit(rolePerms, BIT("CRM.DEALS.VIEW"));
    vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
      { id: ROLE_ID, permissions: rolePerms, priority: 100 },
    ]);

    vi.mocked(permissionRepository.getResourceChain).mockResolvedValue([
      { id: RESOURCE_ID, path: `/${RESOURCE_ID}/`, depth: 0 },
    ]);
  });

  // ── Core: allow wins when a single overwrite has both deny and allow ─────────

  describe("single overwrite with both allow=BIT and deny=BIT (role overwrite)", () => {
    it("allow wins → bit is SET (CRM.DEALS.UPDATE)", async () => {
      const both = EMPTY_BITSET();
      setBit(both, BIT("CRM.DEALS.UPDATE"));

      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue([
        {
          resourceId: RESOURCE_ID,
          roleId: ROLE_ID,
          userId: null,
          allow: both, // allow UPDATE
          deny: both, // also deny UPDATE — same buffer, same bit
        },
      ]);

      const result = await service.can(
        TENANT_ID,
        USER_ID,
        RESOURCE_ID,
        "CRM.DEALS.UPDATE",
      );
      // Formula: (perms AND_NOT deny) OR allow
      //   step 1: UPDATE cleared
      //   step 2: UPDATE set by allow
      // Net result: UPDATE is SET → true
      expect(result).toBe(true);
    });

    it("allow wins → bit is SET (CRM.DEALS.DELETE)", async () => {
      const both = EMPTY_BITSET();
      setBit(both, BIT("CRM.DEALS.DELETE"));

      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue([
        {
          resourceId: RESOURCE_ID,
          roleId: ROLE_ID,
          userId: null,
          allow: both,
          deny: both,
        },
      ]);

      const result = await service.can(
        TENANT_ID,
        USER_ID,
        RESOURCE_ID,
        "CRM.DEALS.DELETE",
      );
      expect(result).toBe(true);
    });

    it("allow wins for user overwrite (user-level overwrite with allow=BIT, deny=BIT)", async () => {
      const both = EMPTY_BITSET();
      setBit(both, BIT("CRM.DEALS.UPDATE"));

      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue([
        {
          resourceId: RESOURCE_ID,
          roleId: null,
          userId: USER_ID,
          allow: both,
          deny: both,
        },
      ]);

      const result = await service.can(
        TENANT_ID,
        USER_ID,
        RESOURCE_ID,
        "CRM.DEALS.UPDATE",
      );
      expect(result).toBe(true);
    });
  });

  // ── Deny-only overwrite ────────────────────────────────────────────────────

  describe("deny-only overwrite (role)", () => {
    it("deny=BIT, allow=empty → bit is cleared even if it was in base mask", async () => {
      const denyOnly = EMPTY_BITSET();
      setBit(denyOnly, BIT("CRM.DEALS.VIEW")); // VIEW was in base mask

      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue([
        {
          resourceId: RESOURCE_ID,
          roleId: ROLE_ID,
          userId: null,
          allow: EMPTY_BITSET(),
          deny: denyOnly,
        },
      ]);

      const result = await service.can(
        TENANT_ID,
        USER_ID,
        RESOURCE_ID,
        "CRM.DEALS.VIEW",
      );
      expect(result).toBe(false);
    });
  });

  // ── Allow-only overwrite (grants not in base mask) ─────────────────────────

  describe("allow-only overwrite (role)", () => {
    it("allow=BIT, deny=empty → bit is set even if it was not in base mask", async () => {
      const allowOnly = EMPTY_BITSET();
      setBit(allowOnly, BIT("CRM.DEALS.DELETE")); // DELETE was NOT in base mask

      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue([
        {
          resourceId: RESOURCE_ID,
          roleId: ROLE_ID,
          userId: null,
          allow: allowOnly,
          deny: EMPTY_BITSET(),
        },
      ]);

      const result = await service.can(
        TENANT_ID,
        USER_ID,
        RESOURCE_ID,
        "CRM.DEALS.DELETE",
      );
      expect(result).toBe(true);
    });
  });

  // ── Multi-overwrite ordering ───────────────────────────────────────────────

  describe("multiple role overwrites applied sequentially", () => {
    it("second overwrite can re-allow what a first overwrite denied", async () => {
      const denyUpdate = EMPTY_BITSET();
      setBit(denyUpdate, BIT("CRM.DEALS.UPDATE"));

      const allowUpdate = EMPTY_BITSET();
      setBit(allowUpdate, BIT("CRM.DEALS.UPDATE"));

      // Two role overwrites on the same resource (different roles, but same user has both)
      const ROLE_ID_2 = "role-secondary-0000-0000-000000000001";
      const role2Perms = EMPTY_BITSET();
      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
        { id: ROLE_ID, permissions: EMPTY_BITSET(), priority: 200 },
        { id: ROLE_ID_2, permissions: EMPTY_BITSET(), priority: 100 },
      ]);

      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue([
        {
          resourceId: RESOURCE_ID,
          roleId: ROLE_ID, // first role: deny UPDATE
          userId: null,
          allow: EMPTY_BITSET(),
          deny: denyUpdate,
        },
        {
          resourceId: RESOURCE_ID,
          roleId: ROLE_ID_2, // second role: allow UPDATE
          userId: null,
          allow: allowUpdate,
          deny: EMPTY_BITSET(),
        },
      ]);

      // The service iterates userRoles in priority order, applying overwrites per role.
      // ROLE_ID (priority 200) deny→UPDATE cleared
      // ROLE_ID_2 (priority 100) allow→UPDATE set again
      const result = await service.can(
        TENANT_ID,
        USER_ID,
        RESOURCE_ID,
        "CRM.DEALS.UPDATE",
      );
      expect(result).toBe(true);
    });

    it("user overwrite deny overrides role overwrite allow on the same node", async () => {
      const roleAllow = EMPTY_BITSET();
      setBit(roleAllow, BIT("CRM.DEALS.DELETE"));

      const userDeny = EMPTY_BITSET();
      setBit(userDeny, BIT("CRM.DEALS.DELETE"));

      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue([
        {
          resourceId: RESOURCE_ID,
          roleId: ROLE_ID, // role allows DELETE
          userId: null,
          allow: roleAllow,
          deny: EMPTY_BITSET(),
        },
        {
          resourceId: RESOURCE_ID,
          roleId: null, // user denies DELETE (applied AFTER role overwrites)
          userId: USER_ID,
          allow: EMPTY_BITSET(),
          deny: userDeny,
        },
      ]);

      const result = await service.can(
        TENANT_ID,
        USER_ID,
        RESOURCE_ID,
        "CRM.DEALS.DELETE",
      );
      // User overwrite is applied last (after all role overwrites), so deny wins
      expect(result).toBe(false);
    });
  });

  // ── Empty overwrites ───────────────────────────────────────────────────────

  describe("no overwrites", () => {
    it("permissions come solely from role base mask when no overwrites exist", async () => {
      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue(
        [],
      );

      // VIEW is in base mask
      const viewResult = await service.can(
        TENANT_ID,
        USER_ID,
        RESOURCE_ID,
        "CRM.DEALS.VIEW",
      );
      expect(viewResult).toBe(true);

      // DELETE is NOT in base mask
      const deleteResult = await service.can(
        TENANT_ID,
        USER_ID,
        RESOURCE_ID,
        "CRM.DEALS.DELETE",
      );
      expect(deleteResult).toBe(false);
    });
  });
});
