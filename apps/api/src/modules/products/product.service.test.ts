import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProductService } from "./product.service";
import type { ProductRepository } from "./product.repository";
import { createError } from "@/middlewares/errorHandler";

const mockFindProductById = vi.fn();
const mockFindProductForUpdate = vi.fn();
const mockSoftDeleteProduct = vi.fn();

const mockRepo = {
  findProductById: mockFindProductById,
  findProductForUpdate: mockFindProductForUpdate,
  softDeleteProduct: mockSoftDeleteProduct,
} as unknown as ProductRepository;

vi.mock("@/shared/audit/createDeleteAuditLog", () => ({
  createDeleteAuditLog: vi.fn().mockResolvedValue(undefined),
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
  });
});
