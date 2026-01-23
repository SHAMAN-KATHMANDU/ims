"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProducts,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllDiscountTypes,
  type Product,
  type ProductVariation,
  type CreateProductData,
  type UpdateProductData,
  type ProductListParams,
  type PaginatedProductsResponse,
  type PaginationMeta,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/services/productService";
import {
  getAllCategories,
  getCategoryById,
  getCategorySubcategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  deleteSubcategory,
  type Category,
  type CreateCategoryData,
  type UpdateCategoryData,
} from "@/services/categoryService";

// Re-export types for convenience
export type {
  Product,
  Category,
  ProductVariation,
  ProductListParams,
  PaginatedProductsResponse,
  PaginationMeta,
};

// Re-export defaults
export { DEFAULT_PAGE, DEFAULT_LIMIT };

// ============================================
// Query Keys
// ============================================

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (params: ProductListParams) =>
    [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

export const categoryKeys = {
  all: ["categories"] as const,
  lists: () => [...categoryKeys.all, "list"] as const,
  list: (filters: string) => [...categoryKeys.lists(), { filters }] as const,
  details: () => [...categoryKeys.all, "detail"] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
};

// ============================================
// Product Hooks
// ============================================

/**
 * Hook for fetching paginated products with search and filter support
 *
 * @param params - Pagination, search, and filter parameters
 * @returns Query result with products data and pagination info
 */
export function useProductsPaginated(params: ProductListParams = {}) {
  const normalizedParams: ProductListParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    search: params.search?.trim() || "",
    locationId: params.locationId,
    categoryId: params.categoryId,
  };

  return useQuery({
    queryKey: productKeys.list(normalizedParams),
    queryFn: () => getProducts(normalizedParams),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for fetching all products without pagination
 * @deprecated Use useProductsPaginated for better performance
 */
export function useProducts() {
  return useQuery({
    queryKey: productKeys.lists(),
    queryFn: getAllProducts,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => getProductById(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductData) => createProduct(data),
    onSuccess: () => {
      // Invalidate all product lists (paginated and non-paginated)
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductData }) =>
      updateProduct(id, data),
    onSuccess: (_, variables) => {
      // Invalidate all product lists and the specific product detail
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      // Invalidate all product lists
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

// ============================================
// Category Hooks
// ============================================

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.lists(),
    queryFn: getAllCategories,
  });
}

// ============================================
// Discount Type Hooks
// ============================================

export const discountTypeKeys = {
  all: ["discountTypes"] as const,
  lists: () => [...discountTypeKeys.all, "list"] as const,
};

export function useDiscountTypes() {
  return useQuery({
    queryKey: discountTypeKeys.lists(),
    queryFn: getAllDiscountTypes,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - discount types rarely change
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => getCategoryById(id),
    enabled: !!id,
  });
}

export function useCategorySubcategories(categoryId: string) {
  return useQuery({
    queryKey: categoryKeys.detail(`${categoryId}-subcategories`),
    queryFn: () => getCategorySubcategories(categoryId),
    enabled: !!categoryId,
  });
}

export function useCreateSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, name }: { categoryId: string; name: string }) =>
      createSubcategory(categoryId, name),
    onSuccess: (_data, variables) => {
      // Refresh category subcategories and category lists
      queryClient.invalidateQueries({
        queryKey: categoryKeys.detail(`${variables.categoryId}-subcategories`),
      });
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}

export function useDeleteSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, name }: { categoryId: string; name: string }) =>
      deleteSubcategory(categoryId, name),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: categoryKeys.detail(`${variables.categoryId}-subcategories`),
      });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryData) => createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryData }) =>
      updateCategory(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: categoryKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}

// ============================================
// Variations (managed through products)
// ============================================

export function useVariations() {
  return {
    variations: [] as ProductVariation[],
    isLoading: false,
    addVariation: async () => {
      throw new Error(
        "Variations should be added through product creation/update",
      );
    },
    updateVariation: async () => {
      throw new Error("Variations should be updated through product update");
    },
    deleteVariation: async () => {
      throw new Error("Variations should be deleted through product update");
    },
  };
}
