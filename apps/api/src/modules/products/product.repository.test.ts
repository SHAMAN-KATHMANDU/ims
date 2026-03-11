/**
 * Unit tests for ProductRepository — query construction and tenant scoping.
 * Mocks Prisma to verify correct calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockProductFindFirst, mockProductCreate } = vi.hoisted(() => ({
  mockProductFindFirst: vi.fn(),
  mockProductCreate: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    product: {
      findFirst: mockProductFindFirst,
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: mockProductCreate,
      update: vi.fn(),
      count: vi.fn(),
    },
    category: { findFirst: vi.fn(), findMany: vi.fn() },
    vendor: { findUnique: vi.fn() },
    discountType: { findFirst: vi.fn() },
    productVariation: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    locationInventory: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    location: { findFirst: vi.fn() },
    attributeType: { findMany: vi.fn() },
    productAttributeType: { createMany: vi.fn(), deleteMany: vi.fn() },
    productDiscount: { deleteMany: vi.fn() },
    productSubVariation: { delete: vi.fn(), create: vi.fn() },
    variationPhoto: { deleteMany: vi.fn() },
    auditLog: { create: vi.fn() },
    productAttributeTypes: { createMany: vi.fn() },
  },
}));

vi.mock("@/utils/pagination", () => ({
  getPaginationParams: vi.fn().mockReturnValue({
    page: 1,
    limit: 10,
    sortBy: "dateCreated",
    sortOrder: "desc" as const,
  }),
  createPaginationResult: vi.fn((data: unknown, total: number) => ({
    data,
    pagination: { totalItems: total, currentPage: 1, totalPages: 1 },
  })),
  getPrismaOrderBy: vi.fn().mockReturnValue({ dateCreated: "desc" }),
}));

import productRepository from "./product.repository";

describe("ProductRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findProductIdByTenantAndImsCode", () => {
    it("queries with tenantId and trimmed imsCode", async () => {
      mockProductFindFirst.mockResolvedValue({ id: "p1" });

      await productRepository.findProductIdByTenantAndImsCode(
        "t1",
        "  P-001  ",
      );

      expect(mockProductFindFirst).toHaveBeenCalledWith({
        where: {
          tenantId: "t1",
          imsCode: "P-001",
          deletedAt: null,
        },
        select: { id: true },
      });
    });

    it("returns null when product not found", async () => {
      mockProductFindFirst.mockResolvedValue(null);

      const result = await productRepository.findProductIdByTenantAndImsCode(
        "t1",
        "MISSING",
      );

      expect(result).toBeNull();
    });
  });

  describe("findProductByIdForTenant", () => {
    it("queries with tenant scoping", async () => {
      mockProductFindFirst.mockResolvedValue({
        id: "p1",
        name: "Widget",
      });

      const result = await productRepository.findProductByIdForTenant(
        "p1",
        "t1",
      );

      expect(mockProductFindFirst).toHaveBeenCalledWith({
        where: { id: "p1", tenantId: "t1" },
        select: { id: true, name: true },
      });
      expect(result?.id).toBe("p1");
      expect(result?.name).toBe("Widget");
    });

    it("returns null when product not found for tenant", async () => {
      mockProductFindFirst.mockResolvedValue(null);

      const result = await productRepository.findProductByIdForTenant(
        "p1",
        "other-tenant",
      );

      expect(result).toBeNull();
    });
  });

  describe("createProduct", () => {
    it("calls prisma.product.create with correct data", async () => {
      mockProductCreate.mockResolvedValue({
        id: "p1",
        imsCode: "P-001",
        name: "Widget",
        tenantId: "t1",
      });

      await productRepository.createProduct({
        tenantId: "t1",
        imsCode: "P-001",
        name: "Widget",
        categoryId: "cat1",
        description: null,
        subCategory: null,
        length: null,
        breadth: null,
        height: null,
        weight: null,
        costPrice: 50,
        mrp: 100,
        vendorId: null,
        createdById: "u1",
      });

      expect(mockProductCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: "t1",
          imsCode: "P-001",
          name: "Widget",
          categoryId: "cat1",
          costPrice: 50,
          mrp: 100,
          createdById: "u1",
        }),
        include: expect.any(Object),
      });
    });
  });
});
