/**
 * Integration tests: ADMINISTRATOR bit bypass in the RBAC resolution engine.
 *
 * Per RBAC_CONTRACT.md §7, the "Platform Admin" and "Super Admin" system roles
 * have only the ADMINISTRATOR bit set (bit 511). When this bit is present in a
 * user's base mask, permissionService.can() returns true for EVERY catalog key —
 * including the most dangerous permissions such as SETTINGS.AUDIT.PURGE.
 *
 * Conversely, a regular user with no explicit grants can() false for any key
 * that is not in their role bitset.
 *
 * Uses mocked permissionRepository/cache — no DB required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PermissionService } from "@/modules/permissions/permission.service";
import { permissionRepository } from "@/modules/permissions/permission.repository";
import { permissionCache } from "@/modules/permissions/permission.cache";
import {
  EMPTY_BITSET,
  setBit,
  BITSET_BYTES,
} from "@/shared/permissions/bitset";
import {
  ADMINISTRATOR_BIT,
  PERMISSION_BY_KEY,
} from "@repo/shared/src/permissions/catalog";

vi.mock("@/modules/permissions/permission.repository");
vi.mock("@/modules/permissions/permission.cache");

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TENANT_ID = "tenant-admin-bypass-0000-000000000001";
const ADMIN_USER_ID = "user-platform-admin-0000-000000000001";
const REGULAR_USER_ID = "user-member-0000-0000-000000000001";
const ROLE_PLATFORM_ADMIN_ID = "role-platform-admin-0000-000000000001";
const ROLE_MEMBER_ID = "role-member-bypass-0000-000000000001";
const RESOURCE_ID = "resource-bypass-0000-0000-000000000001";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ADMINISTRATOR bit bypass", () => {
  let service: PermissionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PermissionService();
    vi.mocked(permissionCache.get).mockResolvedValue(null);
    vi.mocked(permissionCache.set).mockResolvedValue(undefined);
  });

  // ── ADMINISTRATOR user: all permissions granted ────────────────────────────

  describe("user with ADMINISTRATOR bit", () => {
    beforeEach(() => {
      // Platform Admin role: only ADMINISTRATOR bit set (bit 511)
      const adminPerms = EMPTY_BITSET();
      setBit(adminPerms, ADMINISTRATOR_BIT);

      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
        {
          id: ROLE_PLATFORM_ADMIN_ID,
          permissions: adminPerms,
          priority: 10000,
        },
      ]);
    });

    it("can() returns true for every catalog key", async () => {
      // Sample a handful of catalog keys, including the dangerous ones
      const keysToCheck = [
        "INVENTORY.PRODUCTS.VIEW",
        "INVENTORY.PRODUCTS.DELETE",
        "CRM.DEALS.DELETE",
        "SETTINGS.AUDIT.PURGE",
        "SETTINGS.ROLES.MANAGE",
        "SETTINGS.MEMBERS.REVOKE",
        "SETTINGS.TENANT.UPDATE_PLAN",
      ];

      for (const key of keysToCheck) {
        const result = await service.can(
          TENANT_ID,
          ADMIN_USER_ID,
          RESOURCE_ID,
          key,
        );
        expect(result, `Expected true for ${key}`).toBe(true);
      }
    });

    it("short-circuits before walking the resource ancestor chain", async () => {
      await service.can(
        TENANT_ID,
        ADMIN_USER_ID,
        RESOURCE_ID,
        "SETTINGS.AUDIT.PURGE",
      );

      // getResourceChain should never be called — ADMINISTRATOR exits early
      expect(permissionRepository.getResourceChain).not.toHaveBeenCalled();
      expect(permissionRepository.getOverwritesForChain).not.toHaveBeenCalled();
    });

    it("caches the ADMINISTRATOR bitset (for performance)", async () => {
      await service.can(
        TENANT_ID,
        ADMIN_USER_ID,
        RESOURCE_ID,
        "CRM.DEALS.DELETE",
      );

      expect(permissionCache.set).toHaveBeenCalledWith(
        TENANT_ID,
        ADMIN_USER_ID,
        RESOURCE_ID,
        expect.any(Buffer),
      );
      // Verify the cached buffer has the ADMINISTRATOR bit set
      const cachedBuf: Buffer = vi.mocked(permissionCache.set).mock.calls[0][3];
      expect(
        cachedBuf[ADMINISTRATOR_BIT >> 3] & (1 << (ADMINISTRATOR_BIT & 7)),
      ).not.toBe(0);
    });

    it("can() returns true for SETTINGS.AUDIT.PURGE (dangerous permission)", async () => {
      const result = await service.can(
        TENANT_ID,
        ADMIN_USER_ID,
        RESOURCE_ID,
        "SETTINGS.AUDIT.PURGE",
      );
      expect(result).toBe(true);
    });
  });

  // ── Regular user: no explicit grant → false ────────────────────────────────

  describe("user without ADMINISTRATOR and without explicit grant", () => {
    beforeEach(() => {
      // Member role: only VIEW permissions (no SETTINGS.AUDIT.PURGE)
      const memberPerms = EMPTY_BITSET();
      // Give just CRM.DEALS.VIEW so the user isn't totally empty
      const viewDef = PERMISSION_BY_KEY.get("CRM.DEALS.VIEW")!;
      setBit(memberPerms, viewDef.bit);

      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
        { id: ROLE_MEMBER_ID, permissions: memberPerms, priority: 100 },
      ]);

      vi.mocked(permissionRepository.getResourceChain).mockResolvedValue([
        { id: RESOURCE_ID, path: `/${RESOURCE_ID}/`, depth: 0 },
      ]);
      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue(
        [],
      );
    });

    it("can('SETTINGS.AUDIT.PURGE') → false (not in role bitset, no ADMINISTRATOR)", async () => {
      const result = await service.can(
        TENANT_ID,
        REGULAR_USER_ID,
        RESOURCE_ID,
        "SETTINGS.AUDIT.PURGE",
      );
      expect(result).toBe(false);
    });

    it("can('SETTINGS.ROLES.MANAGE') → false (not in member role)", async () => {
      const result = await service.can(
        TENANT_ID,
        REGULAR_USER_ID,
        RESOURCE_ID,
        "SETTINGS.ROLES.MANAGE",
      );
      expect(result).toBe(false);
    });

    it("can('SETTINGS.TENANT.UPDATE_PLAN') → false", async () => {
      const result = await service.can(
        TENANT_ID,
        REGULAR_USER_ID,
        RESOURCE_ID,
        "SETTINGS.TENANT.UPDATE_PLAN",
      );
      expect(result).toBe(false);
    });

    it("can('CRM.DEALS.VIEW') → true (the one permission the member role has)", async () => {
      const result = await service.can(
        TENANT_ID,
        REGULAR_USER_ID,
        RESOURCE_ID,
        "CRM.DEALS.VIEW",
      );
      expect(result).toBe(true);
    });

    it("can('UNKNOWN.DOES.NOT.EXIST') → false (unknown key fails closed)", async () => {
      const result = await service.can(
        TENANT_ID,
        REGULAR_USER_ID,
        RESOURCE_ID,
        "UNKNOWN.DOES.NOT.EXIST",
      );
      expect(result).toBe(false);
    });

    it("user with zero roles can() returns false for every checked key", async () => {
      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([]);

      const result = await service.can(
        TENANT_ID,
        REGULAR_USER_ID,
        RESOURCE_ID,
        "SETTINGS.AUDIT.PURGE",
      );
      expect(result).toBe(false);
    });
  });

  // ── ADMINISTRATOR bit position sanity check ────────────────────────────────

  describe("ADMINISTRATOR bit position", () => {
    it("ADMINISTRATOR_BIT is 511 (per RBAC_CONTRACT.md §3)", () => {
      expect(ADMINISTRATOR_BIT).toBe(511);
    });

    it("ADMINISTRATOR_BIT fits within a 64-byte bitset (512 bits)", () => {
      expect(ADMINISTRATOR_BIT).toBeLessThan(BITSET_BYTES * 8);
    });

    it("ADMINISTRATOR_BIT is in the last byte of the bitset", () => {
      // bit 511 → byte 63 (511 >> 3 = 63)
      expect(ADMINISTRATOR_BIT >> 3).toBe(63);
    });
  });
});
