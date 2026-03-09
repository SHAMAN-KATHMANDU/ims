import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrashRepository, TRASH_ENTITY_CONFIGS } from "./trash.repository";

vi.mock("@/config/prisma", () => {
  const delegate = {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  return {
    default: {
      product: delegate,
      category: delegate,
      subCategory: delegate,
      vendor: delegate,
      member: delegate,
      location: delegate,
      promoCode: delegate,
      company: delegate,
      contact: delegate,
      lead: delegate,
      deal: delegate,
      task: delegate,
      activity: delegate,
      pipeline: delegate,
    },
  };
});

import prisma from "@/config/prisma";

describe("TrashRepository", () => {
  let repo: TrashRepository;
  const delegate = (
    prisma as unknown as Record<
      string,
      {
        findMany: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
      }
    >
  ).product;

  beforeEach(() => {
    vi.clearAllMocks();
    delegate.findMany.mockResolvedValue([]);
    delegate.findFirst.mockResolvedValue(null);
    delegate.update.mockResolvedValue({});
    delegate.delete.mockResolvedValue({});
    repo = new TrashRepository();
  });

  describe("findTrashed", () => {
    it("returns empty array when no trashed items exist", async () => {
      const result = await repo.findTrashed(TRASH_ENTITY_CONFIGS);

      expect(result).toEqual([]);
      expect(delegate.findMany).toHaveBeenCalled();
    });

    it("returns trashed items with correct structure", async () => {
      delegate.findMany.mockResolvedValueOnce([
        {
          id: "p1",
          name: "Product A",
          deletedAt: new Date("2026-03-01"),
          deletedBy: "u1",
          deleteReason: null,
          tenantId: "t1",
          tenant: { name: "Acme" },
        },
      ]);

      const result = await repo.findTrashed(
        TRASH_ENTITY_CONFIGS.filter((e) => e.type === "Product"),
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        entityType: "Product",
        id: "p1",
        name: "Product A",
        tenantId: "t1",
        tenantName: "Acme",
      });
      expect(result[0].deletedAt).toBeDefined();
    });

    it("filters by tenantId when provided", async () => {
      await repo.findTrashed(TRASH_ENTITY_CONFIGS, "t1");

      expect(delegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: { not: null },
            tenantId: "t1",
          }),
        }),
      );
    });
  });

  describe("restore", () => {
    it("returns true when item is restored", async () => {
      const config = TRASH_ENTITY_CONFIGS.find((e) => e.type === "Product")!;
      delegate.findFirst.mockResolvedValue({ id: "p1" });

      const result = await repo.restore("p1", config);

      expect(result).toBe(true);
      expect(delegate.findFirst).toHaveBeenCalledWith({
        where: { id: "p1", deletedAt: { not: null } },
      });
      expect(delegate.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { deletedAt: null },
      });
    });

    it("returns false when item not found or not in trash", async () => {
      const config = TRASH_ENTITY_CONFIGS.find((e) => e.type === "Product")!;
      delegate.findFirst.mockResolvedValue(null);

      const result = await repo.restore("nonexistent", config);

      expect(result).toBe(false);
      expect(delegate.update).not.toHaveBeenCalled();
    });
  });

  describe("permanentlyDelete", () => {
    it("returns true when item is permanently deleted", async () => {
      const config = TRASH_ENTITY_CONFIGS.find((e) => e.type === "Product")!;
      delegate.findFirst.mockResolvedValue({ id: "p1" });

      const result = await repo.permanentlyDelete("p1", config);

      expect(result).toBe(true);
      expect(delegate.findFirst).toHaveBeenCalledWith({
        where: { id: "p1", deletedAt: { not: null } },
      });
      expect(delegate.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
    });

    it("returns false when item not found or not in trash", async () => {
      const config = TRASH_ENTITY_CONFIGS.find((e) => e.type === "Product")!;
      delegate.findFirst.mockResolvedValue(null);

      const result = await repo.permanentlyDelete("nonexistent", config);

      expect(result).toBe(false);
      expect(delegate.delete).not.toHaveBeenCalled();
    });
  });
});
