import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProductService } from "./product.service";
import type { ProductRepository } from "./product.repository";
import { createError } from "@/middlewares/errorHandler";

const mockPublishDomainEvent = vi.fn().mockResolvedValue(undefined);
const mockFindProductById = vi.fn();
const mockFindProductForUpdate = vi.fn();
const mockSoftDeleteProduct = vi.fn();
const mockGetLowStockVariationIds = vi.fn();
const mockFindAllProductsByTotalStock = vi.fn();

const mockRepo = {
  findProductById: mockFindProductById,
  findProductForUpdate: mockFindProductForUpdate,
  softDeleteProduct: mockSoftDeleteProduct,
  getLowStockVariationIds: mockGetLowStockVariationIds,
  findAllProductsByTotalStock: mockFindAllProductsByTotalStock,
} as unknown as ProductRepository;

vi.mock("@/shared/audit/createDeleteAuditLog", () => ({
  createDeleteAuditLog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/config/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));
vi.mock("@/modules/automation/automation.service", () => ({
  default: {
    publishDomainEvent: (...args: unknown[]) => mockPublishDomainEvent(...args),
  },
}));

const productService = new ProductService(mockRepo);

describe("ProductService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findById", () => {
    it("returns product when found", async () => {
      const product = {
        id: "p1",
        name: "Widget",
        imsCode: "W001",
        tenantId: "t1",
      };
      mockFindProductById.mockResolvedValue(product);

      const result = await productService.findById("p1");
      expect(result).toEqual(product);
    });

    it("throws 404 when product not found", async () => {
      mockFindProductById.mockResolvedValue(null);

      await expect(productService.findById("missing")).rejects.toMatchObject(
        createError("Product not found", 404),
      );
    });
  });

  describe("delete", () => {
    it("throws 404 when product not found", async () => {
      mockFindProductForUpdate.mockResolvedValue(null);

      await expect(
        productService.delete("missing", {
          userId: "u1",
          tenantId: "t1",
        }),
      ).rejects.toMatchObject(createError("Product not found", 404));

      expect(mockSoftDeleteProduct).not.toHaveBeenCalled();
    });

    it("publishes an automation event after delete", async () => {
      mockFindProductForUpdate.mockResolvedValue({
        id: "p1",
        name: "Widget",
        imsCode: "W001",
        categoryId: "c1",
        vendorId: "v1",
      });
      mockSoftDeleteProduct.mockResolvedValue(undefined);

      await productService.delete("p1", {
        userId: "u1",
        tenantId: "t1",
      });

      expect(mockPublishDomainEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          eventName: "catalog.product.updated",
          entityId: "p1",
        }),
      );
    });
  });

  describe("findAll totalStock sorting", () => {
    it("uses totalStock repository path for ascending sort", async () => {
      mockFindAllProductsByTotalStock.mockResolvedValue({
        products: [{ id: "p-low" }, { id: "p-high" }],
        totalItems: 2,
      });

      const result = await productService.findAll("tenant-1", {
        page: 1,
        limit: 10,
        sortBy: "totalStock",
        sortOrder: "asc",
      });

      expect(mockFindAllProductsByTotalStock).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: "tenant-1" }),
        "asc",
        0,
        10,
      );
      expect(result.data).toHaveLength(2);
      expect(result.pagination.totalItems).toBe(2);
    });

    it("passes lowStock variation ids in totalStock path", async () => {
      mockGetLowStockVariationIds.mockResolvedValue(["var-1"]);
      mockFindAllProductsByTotalStock.mockResolvedValue({
        products: [{ id: "p-1" }],
        totalItems: 1,
      });

      const result = await productService.findAll("tenant-1", {
        page: 1,
        limit: 10,
        sortBy: "totalstock",
        sortOrder: "desc",
        lowStock: true,
      });

      expect(mockGetLowStockVariationIds).toHaveBeenCalled();
      expect(mockFindAllProductsByTotalStock).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "tenant-1",
          lowStock: true,
          lowStockVariationIds: ["var-1"],
        }),
        "desc",
        0,
        10,
      );
      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalItems).toBe(1);
    });
  });
});
