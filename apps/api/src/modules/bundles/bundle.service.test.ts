import { describe, it, expect, vi, beforeEach } from "vitest";
import { BundleService } from "./bundle.service";
import type { BundleRepository } from "./bundle.repository";
import { createError } from "@/middlewares/errorHandler";

const mockFindFirstBySlug = vi.fn();
const mockFindById = vi.fn();
const mockFindActiveBySlug = vi.fn();
const mockCount = vi.fn();
const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockSoftDelete = vi.fn();
const mockDereferenceProducts = vi.fn();

const mockRepo: BundleRepository = {
  findFirstBySlug: mockFindFirstBySlug,
  findById: mockFindById,
  findActiveBySlug: mockFindActiveBySlug,
  count: mockCount,
  findMany: mockFindMany,
  create: mockCreate,
  update: mockUpdate,
  softDelete: mockSoftDelete,
  dereferenceProducts: mockDereferenceProducts,
} as unknown as BundleRepository;

const service = new BundleService(mockRepo);

describe("BundleService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates when slug is available", async () => {
      mockFindFirstBySlug.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: "b1", slug: "pack" });

      const result = await service.create("t1", {
        name: "Pack",
        slug: "pack",
        productIds: [],
        pricingStrategy: "SUM",
        active: true,
      });

      expect(result.id).toBe("b1");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          slug: "pack",
          pricingStrategy: "SUM",
          discountPct: null,
          fixedPrice: null,
          description: null,
        }),
      );
    });

    it("throws 409 when slug taken", async () => {
      mockFindFirstBySlug.mockResolvedValue({ id: "b0", slug: "pack" });

      await expect(
        service.create("t1", {
          name: "Pack",
          slug: "pack",
          productIds: [],
          pricingStrategy: "SUM",
          active: true,
        }),
      ).rejects.toMatchObject(
        createError("Bundle with this slug already exists", 409),
      );

      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("returns null when not found", async () => {
      mockFindById.mockResolvedValue(null);
      const result = await service.update("t1", "missing", { name: "New" });
      expect(result).toBeNull();
    });

    it("throws 409 when new slug conflicts with a different bundle", async () => {
      mockFindById.mockResolvedValue({ id: "b1", slug: "old" });
      mockFindFirstBySlug.mockResolvedValue({ id: "b2", slug: "new" });

      await expect(
        service.update("t1", "b1", { slug: "new" }),
      ).rejects.toMatchObject(
        createError("Bundle with this slug already exists", 409),
      );
    });

    it("allows same-id slug (idempotent)", async () => {
      mockFindById.mockResolvedValue({ id: "b1", slug: "old" });
      mockFindFirstBySlug.mockResolvedValue({ id: "b1", slug: "new" });
      mockUpdate.mockResolvedValue({ id: "b1", slug: "new" });

      const r = await service.update("t1", "b1", { slug: "new" });
      expect(r).toEqual({ id: "b1", slug: "new" });
    });

    it("no-op when update dto has no fields", async () => {
      mockFindById.mockResolvedValue({ id: "b1", slug: "old" });
      const r = await service.update("t1", "b1", {});
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(r).toEqual({ id: "b1", slug: "old" });
    });
  });

  describe("delete", () => {
    it("soft-deletes and returns empty object", async () => {
      mockFindById.mockResolvedValue({ id: "b1" });
      mockSoftDelete.mockResolvedValue({});

      const r = await service.delete("t1", "b1");
      expect(r).toEqual({});
      expect(mockSoftDelete).toHaveBeenCalledWith("b1");
    });

    it("returns null if not found", async () => {
      mockFindById.mockResolvedValue(null);
      const r = await service.delete("t1", "missing");
      expect(r).toBeNull();
      expect(mockSoftDelete).not.toHaveBeenCalled();
    });
  });

  describe("findPublicBySlug", () => {
    it("dereferences productIds preserving order and dropping missing", async () => {
      mockFindActiveBySlug.mockResolvedValue({
        id: "b1",
        slug: "pack",
        productIds: ["p1", "p2", "p3"],
      });
      mockDereferenceProducts.mockResolvedValue([
        { id: "p1", name: "One" },
        { id: "p3", name: "Three" },
      ]);

      const r = await service.findPublicBySlug("t1", "pack");
      expect(r).not.toBeNull();
      expect(r!.products.map((p) => p.id)).toEqual(["p1", "p3"]);
    });

    it("returns null when bundle not found/inactive", async () => {
      mockFindActiveBySlug.mockResolvedValue(null);
      const r = await service.findPublicBySlug("t1", "missing");
      expect(r).toBeNull();
    });
  });

  describe("findAllPublic", () => {
    it("filters to active only", async () => {
      mockCount.mockResolvedValue(0);
      mockFindMany.mockResolvedValue([]);
      await service.findAllPublic("t1", {});
      expect(mockCount).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          active: true,
          deletedAt: null,
        }),
      );
    });
  });
});
