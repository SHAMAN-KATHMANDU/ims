import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetProducts = vi.fn();
const mockCreateProduct = vi.fn();
const mockGetAllProducts = vi.fn();
const mockToast = vi.fn();

vi.mock("../services/product.service", () => ({
  getProducts: (...args: unknown[]) => mockGetProducts(...args),
  getAllProducts: () => mockGetAllProducts(),
  getProductById: vi.fn(),
  createProduct: (...args: unknown[]) => mockCreateProduct(...args),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  deleteVariation: vi.fn(),
  getAllDiscountTypes: vi.fn(),
  getDiscountTypesPaginated: vi.fn(),
  createDiscountType: vi.fn(),
  updateDiscountType: vi.fn(),
  deleteDiscountType: vi.fn(),
  getProductDiscountsList: vi.fn(),
  bulkUploadProducts: vi.fn(),
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
}));

vi.mock("../services/category.service", () => ({
  getCategories: vi.fn(),
  getAllCategories: vi.fn(),
  getCategoryById: vi.fn(),
  getCategorySubcategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  createSubcategory: vi.fn(),
  deleteSubcategory: vi.fn(),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useProductsPaginated, useCreateProduct } from "./use-products";

describe("useProductsPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProducts.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  it("calls getProducts with normalized params", async () => {
    const { result } = renderHook(
      () => useProductsPaginated({ page: 1, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 10,
      }),
    );
    expect(result.current.data?.data).toEqual([]);
  });
});

describe("useCreateProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateProduct.mockResolvedValue({ id: "p1", name: "Product 1" });
  });

  it("calls createProduct and invalidates queries on success", async () => {
    const createData = {
      name: "Test Product",
      imsCode: "IMS-001",
      categoryId: "cat1",
      costPrice: 50,
      mrp: 99,
    };

    const { result } = renderHook(() => useCreateProduct(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateProduct).toHaveBeenCalledWith(createData);
  });
});
