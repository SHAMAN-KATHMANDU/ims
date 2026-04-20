import { describe, it, expect, vi, beforeEach } from "vitest";
import { collectionsService } from "./collections.service";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((err: unknown) => {
    throw err;
  }),
}));

const sampleCollection = {
  id: "c1",
  tenantId: "t1",
  slug: "summer-sale",
  title: "Summer Sale",
  subtitle: null,
  sort: 0,
  isActive: true,
  productCount: 5,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const sampleDetail = {
  ...sampleCollection,
  productIds: ["p1", "p2"],
};
delete (sampleDetail as Record<string, unknown>).productCount;

beforeEach(() => vi.clearAllMocks());

describe("collectionsService", () => {
  // -------------------------------------------------------------------------
  describe("list", () => {
    it("calls GET /collections and returns collections array", async () => {
      mockGet.mockResolvedValue({ data: { collections: [sampleCollection] } });

      const result = await collectionsService.list();

      expect(mockGet).toHaveBeenCalledWith("/collections");
      expect(result).toEqual([sampleCollection]);
    });

    it("returns [] when response has no collections key", async () => {
      mockGet.mockResolvedValue({ data: {} });

      const result = await collectionsService.list();

      expect(result).toEqual([]);
    });

    it("throws when API errors", async () => {
      mockGet.mockRejectedValue(new Error("Network error"));

      await expect(collectionsService.list()).rejects.toThrow("Network error");
    });
  });

  // -------------------------------------------------------------------------
  describe("get", () => {
    it("calls GET /collections/:id and returns collection detail", async () => {
      mockGet.mockResolvedValue({ data: { collection: sampleDetail } });

      const result = await collectionsService.get("c1");

      expect(mockGet).toHaveBeenCalledWith("/collections/c1");
      expect(result).toEqual(sampleDetail);
    });

    it("throws when collection not found", async () => {
      mockGet.mockRejectedValue(new Error("Not found"));

      await expect(collectionsService.get("nonexistent")).rejects.toThrow(
        "Not found",
      );
    });
  });

  // -------------------------------------------------------------------------
  describe("create", () => {
    it("calls POST /collections with payload and returns created collection", async () => {
      mockPost.mockResolvedValue({ data: { collection: sampleCollection } });

      const result = await collectionsService.create({
        slug: "summer-sale",
        title: "Summer Sale",
      });

      expect(mockPost).toHaveBeenCalledWith("/collections", {
        slug: "summer-sale",
        title: "Summer Sale",
      });
      expect(result).toEqual(sampleCollection);
    });

    it("throws on API error", async () => {
      mockPost.mockRejectedValue(new Error("Slug taken"));

      await expect(
        collectionsService.create({ slug: "taken", title: "T" }),
      ).rejects.toThrow("Slug taken");
    });
  });

  // -------------------------------------------------------------------------
  describe("update", () => {
    it("calls PATCH /collections/:id with partial payload", async () => {
      const updated = { ...sampleCollection, title: "New Title" };
      mockPatch.mockResolvedValue({ data: { collection: updated } });

      const result = await collectionsService.update("c1", {
        title: "New Title",
      });

      expect(mockPatch).toHaveBeenCalledWith("/collections/c1", {
        title: "New Title",
      });
      expect(result.title).toBe("New Title");
    });

    it("throws on API error", async () => {
      mockPatch.mockRejectedValue(new Error("Not found"));

      await expect(
        collectionsService.update("c1", { title: "X" }),
      ).rejects.toThrow("Not found");
    });
  });

  // -------------------------------------------------------------------------
  describe("remove", () => {
    it("calls DELETE /collections/:id", async () => {
      mockDelete.mockResolvedValue({});

      await collectionsService.remove("c1");

      expect(mockDelete).toHaveBeenCalledWith("/collections/c1");
    });

    it("resolves without returning a value", async () => {
      mockDelete.mockResolvedValue({});

      const result = await collectionsService.remove("c1");

      expect(result).toBeUndefined();
    });

    it("throws on API error", async () => {
      mockDelete.mockRejectedValue(new Error("Cannot delete"));

      await expect(collectionsService.remove("c1")).rejects.toThrow(
        "Cannot delete",
      );
    });
  });

  // -------------------------------------------------------------------------
  describe("setProducts", () => {
    it("calls PUT /collections/:id/products with productIds array", async () => {
      mockPut.mockResolvedValue({});

      await collectionsService.setProducts("c1", ["p1", "p2", "p3"]);

      expect(mockPut).toHaveBeenCalledWith("/collections/c1/products", {
        productIds: ["p1", "p2", "p3"],
      });
    });

    it("accepts an empty array to clear all products", async () => {
      mockPut.mockResolvedValue({});

      await collectionsService.setProducts("c1", []);

      expect(mockPut).toHaveBeenCalledWith("/collections/c1/products", {
        productIds: [],
      });
    });

    it("throws on API error", async () => {
      mockPut.mockRejectedValue(new Error("Invalid products"));

      await expect(
        collectionsService.setProducts("c1", ["invalid"]),
      ).rejects.toThrow("Invalid products");
    });
  });
});
