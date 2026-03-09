"use client";

/**
 * React Query wrappers for products and categories. Business logic and API calls live in productService/categoryService; hooks only wire query/mutation and cache keys.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import {
  getProducts,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteVariation,
  getAllDiscountTypes,
  createDiscountType,
  updateDiscountType,
  deleteDiscountType,
  getProductDiscountsList,
  bulkUploadProducts,
  type Product,
  type ProductVariation,
  type CreateProductData,
  type UpdateProductData,
  type ProductListParams,
  type PaginatedProductsResponse,
  type PaginationMeta,
  type BulkUploadResponse,
  type ProductDiscountListParams,
  type PaginatedProductDiscountsResponse,
  type ProductDiscountListItem,
  type DiscountType,
  type CreateDiscountTypeData,
  type UpdateDiscountTypeData,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "../services/product.service";
import {
  getCategories,
  getAllCategories,
  getCategoryById,
  getCategorySubcategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  deleteSubcategory,
  type Category,
  type CategoryListParams,
  type PaginatedCategoriesResponse,
  type CreateCategoryData,
  type UpdateCategoryData,
} from "../services/category.service";

// Re-export types for convenience
export type {
  Product,
  Category,
  CategoryListParams,
  PaginatedCategoriesResponse,
  ProductVariation,
  ProductListParams,
  PaginatedProductsResponse,
  PaginationMeta,
  ProductDiscountListItem,
  ProductDiscountListParams,
  PaginatedProductDiscountsResponse,
  DiscountType,
  CreateDiscountTypeData,
  UpdateDiscountTypeData,
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
  list: (params: CategoryListParams) =>
    [...categoryKeys.lists(), params] as const,
  details: () => [...categoryKeys.all, "detail"] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
};

export const productDiscountKeys = {
  all: ["product-discounts"] as const,
  lists: (params: ProductDiscountListParams) =>
    [...productDiscountKeys.all, "list", params] as const,
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
    subCategoryId: params.subCategoryId,
    subCategory: params.subCategory,
    vendorId: params.vendorId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    lowStock: params.lowStock,
  };

  return useQuery({
    queryKey: productKeys.list(normalizedParams),
    queryFn: () => getProducts(normalizedParams),
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: true,
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

/**
 * Hook for fetching paginated product discounts with filters, sort, search
 */
export function useProductDiscountsList(
  params: ProductDiscountListParams = {},
) {
  const normalizedParams: ProductDiscountListParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    search: params.search?.trim() || "",
    productId: params.productId,
    categoryId: params.categoryId,
    subCategoryId: params.subCategoryId,
    discountTypeId: params.discountTypeId,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };

  return useQuery({
    queryKey: productDiscountKeys.lists(normalizedParams),
    queryFn: () => getProductDiscountsList(normalizedParams),
    placeholderData: (previousData) => previousData,
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
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.refetchQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductData }) =>
      updateProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.refetchQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: productDiscountKeys.all });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      deleteProduct(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.refetchQueries({ queryKey: productKeys.all });
    },
  });
}

export function useDeleteVariation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      variationId,
    }: {
      productId: string;
      variationId: string;
    }) => deleteVariation(productId, variationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.refetchQueries({ queryKey: productKeys.all });
    },
  });
}

/**
 * Hook for bulk uploading products from Excel/CSV file
 * Manages upload progress, success/error handling, and query invalidation
 *
 * @returns Object containing mutation, upload progress, and result
 */
export function useBulkUploadProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<BulkUploadResponse | null>(
    null,
  );

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadProgress(0);
      setUploadResult(null);
      return bulkUploadProducts(file, (progress) => {
        setUploadProgress(progress);
      });
    },
    onSuccess: (data) => {
      setUploadResult(data);
      // Invalidate products query to refresh the list
      queryClient.invalidateQueries({ queryKey: productKeys.all });

      if (data.summary.created > 0 || (data.summary.updated ?? 0) > 0) {
        const parts = [];
        if (data.summary.created > 0)
          parts.push(`Created ${data.summary.created} product(s)`);
        if ((data.summary.updated ?? 0) > 0)
          parts.push(
            `updated inventory for ${data.summary.updated} product(s)`,
          );
        toast({
          title: "Bulk upload completed",
          description: parts.join("; "),
        });
      }
    },
    onError: (error: unknown) => {
      setUploadProgress(0);
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to upload file";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const reset = () => {
    setUploadProgress(0);
    setUploadResult(null);
    mutation.reset();
  };

  return {
    mutation,
    uploadProgress,
    uploadResult,
    reset,
    isUploading: mutation.isPending,
  };
}

// ============================================
// Category Hooks
// ============================================

export function useCategoriesPaginated(params: CategoryListParams = {}) {
  const normalizedParams: CategoryListParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    search: params.search?.trim() || "",
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };

  return useQuery({
    queryKey: categoryKeys.list(normalizedParams),
    queryFn: () => getCategories(normalizedParams),
    placeholderData: (prev) => prev,
  });
}

/** Unpaginated -- for dropdowns / selects */
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

export function useCreateDiscountType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateDiscountTypeData) => createDiscountType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountTypeKeys.lists() });
      toast({ title: "Discount type created" });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to create discount type",
        description: err.message,
      });
    },
  });
}

export function useUpdateDiscountType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDiscountTypeData }) =>
      updateDiscountType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountTypeKeys.lists() });
      toast({ title: "Discount type updated" });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update discount type",
        description: err.message,
      });
    },
  });
}

export function useDeleteDiscountType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteDiscountType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountTypeKeys.lists() });
      toast({ title: "Discount type deleted" });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete discount type",
        description: err.message,
      });
    },
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
    mutationFn: ({
      categoryId,
      name,
      reason,
    }: {
      categoryId: string;
      name: string;
      reason?: string;
    }) => deleteSubcategory(categoryId, name, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: categoryKeys.detail(`${variables.categoryId}-subcategories`),
      });
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryData) => createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
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
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      deleteCategory(id, reason),
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
