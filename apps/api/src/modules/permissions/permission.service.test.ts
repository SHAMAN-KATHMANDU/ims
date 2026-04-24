import { describe, it, expect, vi, beforeEach } from "vitest";
import { PermissionService } from "./permission.service";
import { permissionRepository } from "./permission.repository";
import { permissionCache } from "./permission.cache";
import { EMPTY_BITSET, setBit } from "@/shared/permissions/bitset";
import { ADMINISTRATOR_BIT, PERMISSION_BY_KEY } from "@repo/shared";

vi.mock("./permission.repository");
vi.mock("./permission.cache");

describe("PermissionService", () => {
  let service: PermissionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PermissionService();
  });

  describe("getEffectivePermissions", () => {
    it("returns cached result if available", async () => {
      const cachedPerms = EMPTY_BITSET();
      vi.mocked(permissionCache.get).mockResolvedValue(cachedPerms);

      const result = await service.getEffectivePermissions(
        "tenant1",
        "user1",
        "resource1",
      );

      expect(result).toBe(cachedPerms);
      expect(permissionRepository.getUserRoles).not.toHaveBeenCalled();
    });

    it("short-circuits on ADMINISTRATOR bit", async () => {
      vi.mocked(permissionCache.get).mockResolvedValue(null);

      const adminPerms = EMPTY_BITSET();
      setBit(adminPerms, ADMINISTRATOR_BIT);

      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
        { id: "role1", permissions: adminPerms, priority: 1000 },
      ]);
      vi.mocked(permissionRepository.getResourceChain).mockResolvedValue([]);
      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue(
        [],
      );
      vi.mocked(permissionCache.set).mockResolvedValue(undefined);

      const result = await service.getEffectivePermissions(
        "tenant1",
        "user1",
        "resource1",
      );

      expect(result).toEqual(adminPerms);
      // Should not walk chain when admin
      expect(permissionRepository.getResourceChain).not.toHaveBeenCalled();
    });

    it("applies role overwrites in order", async () => {
      vi.mocked(permissionCache.get).mockResolvedValue(null);

      const basePerms = EMPTY_BITSET();
      const productViewDef = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.VIEW")!;
      setBit(basePerms, productViewDef.bit);

      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
        { id: "role1", permissions: basePerms, priority: 100 },
      ]);

      const resource = { id: "res1", path: "/root/res1/", depth: 1 };
      vi.mocked(permissionRepository.getResourceChain).mockResolvedValue([
        resource,
      ]);

      // Role deny overwrite: deny the VIEW permission
      const denyPerms = EMPTY_BITSET();
      setBit(denyPerms, productViewDef.bit);

      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue([
        {
          resourceId: "res1",
          roleId: "role1",
          userId: undefined,
          allow: EMPTY_BITSET(),
          deny: denyPerms,
        },
      ]);
      vi.mocked(permissionCache.set).mockResolvedValue(undefined);

      const result = await service.getEffectivePermissions(
        "tenant1",
        "user1",
        "res1",
      );

      // VIEW should be denied
      expect(
        result[productViewDef.bit >> 3] & (1 << (productViewDef.bit & 7)),
      ).toBe(0);
    });

    it("applies user overwrites after role overwrites", async () => {
      vi.mocked(permissionCache.get).mockResolvedValue(null);

      const basePerms = EMPTY_BITSET();
      const productCreateDef = PERMISSION_BY_KEY.get(
        "INVENTORY.PRODUCTS.CREATE",
      )!;

      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
        { id: "role1", permissions: basePerms, priority: 100 },
      ]);

      const resource = { id: "res1", path: "/root/res1/", depth: 1 };
      vi.mocked(permissionRepository.getResourceChain).mockResolvedValue([
        resource,
      ]);

      // User allow overwrite
      const allowPerms = EMPTY_BITSET();
      setBit(allowPerms, productCreateDef.bit);

      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue([
        {
          resourceId: "res1",
          roleId: undefined,
          userId: "user1",
          allow: allowPerms,
          deny: EMPTY_BITSET(),
        },
      ]);
      vi.mocked(permissionCache.set).mockResolvedValue(undefined);

      const result = await service.getEffectivePermissions(
        "tenant1",
        "user1",
        "res1",
      );

      // CREATE should be granted via user overwrite
      expect(
        result[productCreateDef.bit >> 3] & (1 << (productCreateDef.bit & 7)),
      ).toBe(1 << (productCreateDef.bit & 7));
    });

    it("caches result after computation", async () => {
      vi.mocked(permissionCache.get).mockResolvedValue(null);
      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
        { id: "role1", permissions: EMPTY_BITSET(), priority: 100 },
      ]);
      vi.mocked(permissionRepository.getResourceChain).mockResolvedValue([]);
      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue(
        [],
      );
      vi.mocked(permissionCache.set).mockResolvedValue(undefined);

      await service.getEffectivePermissions("tenant1", "user1", "res1");

      expect(permissionCache.set).toHaveBeenCalledWith(
        "tenant1",
        "user1",
        "res1",
        expect.any(Buffer),
      );
    });
  });

  describe("assert", () => {
    it("throws on permission denied", async () => {
      vi.mocked(permissionCache.get).mockResolvedValue(null);
      vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
        { id: "role1", permissions: EMPTY_BITSET(), priority: 100 },
      ]);
      vi.mocked(permissionRepository.getResourceChain).mockResolvedValue([]);
      vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue(
        [],
      );
      vi.mocked(permissionCache.set).mockResolvedValue(undefined);

      await expect(
        service.assert("tenant1", "user1", "res1", "INVENTORY.PRODUCTS.VIEW"),
      ).rejects.toThrow();
    });
  });
});
