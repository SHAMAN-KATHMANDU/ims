import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/config/prisma", () => ({
  default: {
    productReview: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      count: (...a: unknown[]) => mockCount(...a),
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
  },
}));

import { ReviewsRepository } from "./reviews.repository";

const repo = new ReviewsRepository();
const tenantId = "t1";

describe("ReviewsRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("scopes by tenantId + deletedAt null, orders desc, includes product", async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
      await repo.list(tenantId, { page: 1, limit: 10 });

      const arg = mockFindMany.mock.calls[0][0];
      expect(arg.where).toMatchObject({ tenantId, deletedAt: null });
      expect(arg.orderBy).toEqual({ createdAt: "desc" });
      expect(arg.include).toEqual({
        product: { select: { id: true, name: true } },
      });
      expect(arg.skip).toBe(0);
      expect(arg.take).toBe(10);
    });

    it("applies productId + status filters when provided", async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
      await repo.list(tenantId, {
        productId: "p1",
        status: "APPROVED",
        page: 1,
        limit: 10,
      });

      const arg = mockFindMany.mock.calls[0][0];
      expect(arg.where).toMatchObject({
        tenantId,
        deletedAt: null,
        productId: "p1",
        status: "APPROVED",
      });
    });

    it("computes skip from page/limit", async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
      await repo.list(tenantId, { page: 3, limit: 25 });
      const arg = mockFindMany.mock.calls[0][0];
      expect(arg.skip).toBe(50);
      expect(arg.take).toBe(25);
    });

    it("returns rows + total", async () => {
      mockFindMany.mockResolvedValue([{ id: "r1" }]);
      mockCount.mockResolvedValue(7);
      const result = await repo.list(tenantId, { page: 1, limit: 10 });
      expect(result).toEqual({ rows: [{ id: "r1" }], total: 7 });
    });
  });

  describe("findById", () => {
    it("filters by id, tenantId, and deletedAt null", async () => {
      mockFindFirst.mockResolvedValue(null);
      await repo.findById(tenantId, "r1");
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "r1", tenantId, deletedAt: null },
          include: { product: { select: { id: true, name: true } } },
        }),
      );
    });
  });

  describe("updateStatus", () => {
    it("updates status and returns row with product include", async () => {
      mockUpdate.mockResolvedValue({ id: "r1", status: "APPROVED" });
      await repo.updateStatus(tenantId, "r1", "APPROVED");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "r1" },
          data: { status: "APPROVED" },
          include: { product: { select: { id: true, name: true } } },
        }),
      );
    });
  });

  describe("softDelete", () => {
    it("sets deletedAt and resolves void", async () => {
      mockUpdate.mockResolvedValue({ id: "r1" });
      const result = await repo.softDelete(tenantId, "r1");
      expect(result).toBeUndefined();
      const call = mockUpdate.mock.calls[0][0];
      expect(call.where).toEqual({ id: "r1" });
      expect(call.data.deletedAt).toBeInstanceOf(Date);
    });
  });
});
