/**
 * Category Service
 *
 * Service layer for category management operations.
 * Uses the shared axios instance from lib/axios.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";

// ============================================
// Types
// ============================================

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  subCategories?: { name: string }[];
}

export interface CreateCategoryData {
  name: string;
  description?: string;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
}

interface CategoriesResponse {
  message: string;
  data: Category[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface CategoryResponse {
  message: string;
  category: Category;
}

// ============================================
// API Functions
// ============================================

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<Category[]> {
  try {
    const response = await api.get<CategoriesResponse>("/categories");
    return response.data.data || [];
  } catch (error) {
    handleApiError(error, "fetch categories");
  }
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: string): Promise<Category> {
  if (!id?.trim()) {
    throw new Error("Category ID is required");
  }

  try {
    const response = await api.get<CategoryResponse>(`/categories/${id}`);
    return response.data.category;
  } catch (error) {
    handleApiError(error, `fetch category "${id}"`);
  }
}

export async function getCategorySubcategories(id: string): Promise<string[]> {
  if (!id?.trim()) {
    throw new Error("Category ID is required");
  }
  try {
    const response = await api.get<{
      message: string;
      categoryId: string;
      subcategories: string[];
    }>(`/categories/${id}/subcategories`);
    return response.data.subcategories || [];
  } catch (error) {
    handleApiError(error, `fetch subcategories for category "${id}"`);
  }
}

/**
 * Create a new category
 */
export async function createCategory(
  data: CreateCategoryData,
): Promise<Category> {
  if (!data.name?.trim()) {
    throw new Error("Category name is required");
  }

  try {
    const response = await api.post<CategoryResponse>("/categories", data);
    return response.data.category;
  } catch (error) {
    handleApiError(error, "create category");
  }
}

/**
 * Update a category
 */
export async function updateCategory(
  id: string,
  data: UpdateCategoryData,
): Promise<Category> {
  if (!id?.trim()) {
    throw new Error("Category ID is required");
  }
  if (!data || Object.keys(data).length === 0) {
    throw new Error("Update data is required");
  }

  try {
    const response = await api.put<CategoryResponse>(`/categories/${id}`, data);
    return response.data.category;
  } catch (error) {
    handleApiError(error, `update category "${id}"`);
  }
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<void> {
  if (!id?.trim()) {
    throw new Error("Category ID is required");
  }

  try {
    await api.delete(`/categories/${id}`);
  } catch (error) {
    handleApiError(error, `delete category "${id}"`);
  }
}

export async function createSubcategory(
  categoryId: string,
  name: string,
): Promise<void> {
  if (!categoryId?.trim()) {
    throw new Error("Category ID is required");
  }
  if (!name?.trim()) {
    throw new Error("Subcategory name is required");
  }

  try {
    await api.post(`/categories/${categoryId}/subcategories`, { name });
  } catch (error) {
    handleApiError(error, "create subcategory");
  }
}

export async function deleteSubcategory(
  categoryId: string,
  name: string,
): Promise<void> {
  if (!categoryId?.trim()) {
    throw new Error("Category ID is required");
  }
  if (!name?.trim()) {
    throw new Error("Subcategory name is required");
  }

  try {
    await api.delete(`/categories/${categoryId}/subcategories`, {
      data: { name },
    });
  } catch (error) {
    handleApiError(error, "delete subcategory");
  }
}
