"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "./useAxios";
import {
  ProductService,
  type Product,
  type Category,
  type ProductVariation,
  type CreateProductData,
  type UpdateProductData,
} from "@/services/productService";
import {
  CategoryService,
  type CreateCategoryData,
  type UpdateCategoryData,
} from "@/services/categoryService";

// Re-export types for convenience
export type { Product, Category, ProductVariation };

// Query keys
export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters: string) => [...productKeys.lists(), { filters }] as const,
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
// PRODUCT HOOKS
// ============================================

export function useProducts() {
  const axios = useAxios();
  const productService = new ProductService(axios);

  return useQuery({
    queryKey: productKeys.lists(),
    queryFn: async () => {
      return await productService.getAllProducts();
    },
  });
}

export function useProduct(id: string) {
  const axios = useAxios();
  const productService = new ProductService(axios);

  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: async () => {
      return await productService.getProductById(id);
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const productService = new ProductService(axios);

  return useMutation({
    mutationFn: async (data: CreateProductData) => {
      return await productService.createProduct(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useUpdateProduct() {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const productService = new ProductService(axios);

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateProductData;
    }) => {
      return await productService.updateProduct(id, data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteProduct() {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const productService = new ProductService(axios);

  return useMutation({
    mutationFn: async (id: string) => {
      await productService.deleteProduct(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

// ============================================
// CATEGORY HOOKS
// ============================================

export function useCategories() {
  const axios = useAxios();
  const categoryService = new CategoryService(axios);

  return useQuery({
    queryKey: categoryKeys.lists(),
    queryFn: async () => {
      return await categoryService.getAllCategories();
    },
  });
}

export function useCategory(id: string) {
  const axios = useAxios();
  const categoryService = new CategoryService(axios);

  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: async () => {
      return await categoryService.getCategoryById(id);
    },
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const categoryService = new CategoryService(axios);

  return useMutation({
    mutationFn: async (data: CreateCategoryData) => {
      return await categoryService.createCategory(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}

export function useUpdateCategory() {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const categoryService = new CategoryService(axios);

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCategoryData;
    }) => {
      return await categoryService.updateCategory(id, data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: categoryKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteCategory() {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const categoryService = new CategoryService(axios);

  return useMutation({
    mutationFn: async (id: string) => {
      await categoryService.deleteCategory(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}

// ============================================
// VARIATIONS (kept for backward compatibility)
// ============================================

export function useVariations() {
  // Variations are managed through products
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
