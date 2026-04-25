/**
 * Unit tests for TrashService.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrashService } from "./trash.service";
import type { TrashItem } from "./trash.repository";

const mockFindTrashed = vi.fn();
const mockRestore = vi.fn();
const mockPermanentlyDelete = vi.fn();

const mockRepo = {
  findTrashed: mockFindTrashed,
  restore: mockRestore,
  permanentlyDelete: mockPermanentlyDelete,
};

const trashService = new TrashService(mockRepo as never);

describe("TrashService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindTrashed.mockResolvedValue([]);
  });

  describe("list", () => {
    it("returns paginated trash items", async () => {
      const items: TrashItem[] = [
        {
          entityType: "Product",
          id: "p1",
          name: "Item",
          deletedAt: new Date().toISOString(),
          deletedBy: null,
          deleteReason: null,
          tenantId: "t1",
          tenantName: "Acme",
        },
      ];
      mockFindTrashed.mockResolvedValue(items);

      const result = await trashService.list({ page: 1, limit: 10 });

      expect(result.message).toBe("Trash items retrieved");
      expect(result.data).toEqual(items);
      expect(result.pagination).toBeDefined();
      expect(mockFindTrashed).toHaveBeenCalled();
    });

    it("filters by entityType when provided", async () => {
      mockFindTrashed.mockResolvedValue([]);

      await trashService.list({ page: 1, limit: 10, entityType: "product" });

      expect(mockFindTrashed).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Object)]),
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it("throws 400 when entityType is invalid", async () => {
      await expect(
        trashService.list({ page: 1, limit: 10, entityType: "invalid" }),
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(mockFindTrashed).not.toHaveBeenCalled();
    });

    it("passes tenantId to repo when provided", async () => {
      mockFindTrashed.mockResolvedValue([]);

      await trashService.list({ page: 1, limit: 10, tenantId: "t1" });

      expect(mockFindTrashed).toHaveBeenCalledWith(
        expect.any(Array),
        "t1",
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe("restore", () => {
    it("returns type when restore succeeds", async () => {
      mockRestore.mockResolvedValue(true);

      const result = await trashService.restore("product", "p1");

      expect(result).toEqual({ type: "Product" });
      expect(mockRestore).toHaveBeenCalledWith("p1", expect.any(Object));
    });

    it("throws 404 when item not found", async () => {
      mockRestore.mockResolvedValue(false);

      await expect(
        trashService.restore("product", "nonexistent"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Item not found or not in trash",
      });
    });

    it("throws 400 when entityType is invalid", async () => {
      await expect(trashService.restore("invalid", "p1")).rejects.toMatchObject(
        { statusCode: 400 },
      );

      expect(mockRestore).not.toHaveBeenCalled();
    });
  });

  describe("permanentlyDelete", () => {
    it("returns type when delete succeeds", async () => {
      mockPermanentlyDelete.mockResolvedValue(true);

      const result = await trashService.permanentlyDelete("product", "p1");

      expect(result).toEqual({ type: "Product" });
      expect(mockPermanentlyDelete).toHaveBeenCalledWith(
        "p1",
        expect.any(Object),
      );
    });

    it("throws 404 when item not found", async () => {
      mockPermanentlyDelete.mockResolvedValue(false);

      await expect(
        trashService.permanentlyDelete("product", "nonexistent"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 400 when entityType is invalid", async () => {
      await expect(
        trashService.permanentlyDelete("invalid", "p1"),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
