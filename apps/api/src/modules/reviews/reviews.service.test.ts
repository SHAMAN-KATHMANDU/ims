import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReviewsService } from "./reviews.service";
import type { ReviewsRepository, ReviewRow } from "./reviews.repository";

const mockList = vi.fn();
const mockFindById = vi.fn();
const mockUpdateStatus = vi.fn();
const mockSoftDelete = vi.fn();

const mockRepo = {
  list: mockList,
  findById: mockFindById,
  updateStatus: mockUpdateStatus,
  softDelete: mockSoftDelete,
} as unknown as ReviewsRepository;

const service = new ReviewsService(mockRepo);

const baseRow: ReviewRow = {
  id: "r1",
  tenantId: "t1",
  productId: "p1",
  rating: 5,
  body: "great",
  authorName: "Ada",
  authorEmail: null,
  submittedIp: null,
  status: "PENDING",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  product: { id: "p1", name: "Chair" },
};

describe("ReviewsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("passes filters + paging through to the repo", async () => {
      mockList.mockResolvedValue({ rows: [baseRow], total: 1 });
      const result = await service.list("t1", {
        productId: "p1",
        status: "PENDING",
        page: 2,
        limit: 10,
      });
      expect(mockList).toHaveBeenCalledWith("t1", {
        productId: "p1",
        status: "PENDING",
        page: 2,
        limit: 10,
      });
      expect(result).toEqual({
        rows: [baseRow],
        total: 1,
        page: 2,
        limit: 10,
      });
    });

    it("omits optional filters when undefined", async () => {
      mockList.mockResolvedValue({ rows: [], total: 0 });
      await service.list("t1", { page: 1, limit: 25 });
      expect(mockList).toHaveBeenCalledWith("t1", { page: 1, limit: 25 });
    });
  });

  describe("update", () => {
    it("throws 404 when review missing", async () => {
      mockFindById.mockResolvedValue(null);
      await expect(
        service.update("t1", "r1", { status: "APPROVED" }),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockUpdateStatus).not.toHaveBeenCalled();
    });

    it("returns existing row when patch is a no-op", async () => {
      mockFindById.mockResolvedValue(baseRow);
      const result = await service.update("t1", "r1", {});
      expect(result).toBe(baseRow);
      expect(mockUpdateStatus).not.toHaveBeenCalled();
    });

    it("delegates status change to the repo", async () => {
      mockFindById.mockResolvedValue(baseRow);
      mockUpdateStatus.mockResolvedValue({ ...baseRow, status: "APPROVED" });
      const result = await service.update("t1", "r1", { status: "APPROVED" });
      expect(mockUpdateStatus).toHaveBeenCalledWith("t1", "r1", "APPROVED");
      expect(result.status).toBe("APPROVED");
    });
  });

  describe("remove", () => {
    it("throws 404 when review missing", async () => {
      mockFindById.mockResolvedValue(null);
      await expect(service.remove("t1", "r1")).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockSoftDelete).not.toHaveBeenCalled();
    });

    it("delegates to the repo when review exists", async () => {
      mockFindById.mockResolvedValue(baseRow);
      mockSoftDelete.mockResolvedValue(undefined);
      await service.remove("t1", "r1");
      expect(mockSoftDelete).toHaveBeenCalledWith("t1", "r1");
    });
  });
});
