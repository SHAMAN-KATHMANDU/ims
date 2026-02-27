/**
 * Category Service
 *
 * Service layer for category management operations.
 * Uses the shared axios instance from lib/axios.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";
import {
  type PaginationMeta,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/lib/apiTypes";

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
  _count?: { products: number };
}

export interface CreateCategoryData {
  name: string;
  description?: string;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
}

export interface CategoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedCategoriesResponse {
  data: Category[];
  pagination: PaginationMeta;
}

/** Shape of the paginated GET /categories response body */
interface PaginatedCategoriesApiResponse {
  message: string;
  data: Category[];
  pagination: PaginationMeta;
}

interface CategoryResponse {
  message: string;
  category: Category;
}

// ============================================
// API Functions
// ============================================

/**
 * Get categories with pagination, search, and sorting
 */
export async function getCategories(
  params: CategoryListParams = {},
): Promise<PaginatedCategoriesResponse> {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    search,
    sortBy,
    sortOrder,
  } = params;

  try {
    const queryParams: Record<string, string | number> = { page, limit };
    if (search) queryParams.search = search;
    if (sortBy) queryParams.sortBy = sortBy;
    if (sortOrder) queryParams.sortOrder = sortOrder;

    const response = await api.get<PaginatedCategoriesApiResponse>(
      "/categories",
      { params: queryParams },
    );
    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch categories");
  }
}

/**
 * Get all categories (unpaginated, for dropdowns).
 * Uses a high limit as a practical ceiling — increase if tenants grow beyond this.
 */
export async function getAllCategories(): Promise<Category[]> {
  try {
    const response = await api.get<PaginatedCategoriesApiResponse>(
      "/categories",
      { params: { limit: 1000 } },
    );
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
