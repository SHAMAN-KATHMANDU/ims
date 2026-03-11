import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromoService } from "./promo.service";
import type { PromoRepository } from "./promo.repository";
import { createError } from "@/middlewares/errorHandler";

const mockFindFirstByCode = vi.fn();
const mockResolveTargetProductIds = vi.fn();
const mockCreate = vi.fn();
const mockCount = vi.fn();
const mockFindMany = vi.fn();
const mockFindById = vi.fn();
const mockFindByIdForUpdate = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateAndReplaceProducts = vi.fn();
const mockSoftDelete = vi.fn();

const mockRepo: PromoRepository = {
  findFirstByCode: mockFindFirstByCode,
  resolveTargetProductIds: mockResolveTargetProductIds,
  create: mockCreate,
  count: mockCount,
  findMany: mockFindMany,
  findById: mockFindById,
  findByIdForUpdate: mockFindByIdForUpdate,
  update: mockUpdate,
  updateAndReplaceProducts: mockUpdateAndReplaceProducts,
  softDelete: mockSoftDelete,
} as unknown as PromoRepository;

vi.mock("@/shared/audit/createDeleteAuditLog", () => ({
  createDeleteAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const promoService = new PromoService(mockRepo);

describe("PromoService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveTargetProductIds.mockResolvedValue([]);
  });

  describe("create", () => {
    it("creates promo when code is available", async () => {
      mockFindFirstByCode.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: "p1",
        code: "SAVE10",
        tenantId: "t1",
      });

      const result = await promoService.create("t1", {
        code: "SAVE10",
        valueType: "PERCENTAGE",
        value: 10,
        isActive: true,
      });

      expect(result.code).toBe("SAVE10");
      expect(mockCreate).toHaveBeenCalled();
    });

    it("throws 409 when promo code already exists", async () => {
      mockFindFirstByCode.mockResolvedValue({
        id: "p0",
        code: "SAVE10",
      });

      await expect(
        promoService.create("t1", {
          code: "SAVE10",
          valueType: "PERCENTAGE",
          value: 10,
          isActive: true,
        }),
      ).rejects.toMatchObject(
        createError("Promo code with this code already exists", 409),
      );

      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("returns promo when found", async () => {
      const promo = { id: "p1", code: "SAVE10", tenantId: "t1" };
      mockFindById.mockResolvedValue(promo);

      const result = await promoService.findById("t1", "p1");
      expect(result).toEqual(promo);
    });
  });

  describe("update", () => {
    it("returns null when promo not found", async () => {
      mockFindByIdForUpdate.mockResolvedValue(null);

      const result = await promoService.update("t1", "missing", {
        code: "NEW",
      });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("returns null when promo not found", async () => {
      mockFindByIdForUpdate.mockResolvedValue(null);

      const result = await promoService.delete("t1", "missing", {
        userId: "u1",
      });
      expect(result).toBeNull();
      expect(mockSoftDelete).not.toHaveBeenCalled();
    });
  });
});
