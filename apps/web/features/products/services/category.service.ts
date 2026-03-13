/**
 * Category Service
 *
 * Service layer for category management operations.
 * Uses the shared axios instance from lib/axios.
 */

import { AxiosError } from "axios";
import api from "@/lib/axios";
import { getApiErrorMessage, handleApiError } from "@/lib/api-error";
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
  deletedAt?: string | null;
  subCategories?: { name: string }[];
  _count?: { products: number };
}

export type CategoryStatusFilter = "all" | "active" | "inactive";

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
  status?: CategoryStatusFilter;
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
  restored?: boolean;
}

export interface CreateCategoryResult {
  category: Category;
  restored?: boolean;
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
    if (params.status) queryParams.status = params.status;
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
 * Only returns active (non-deactivated) categories.
 */
export async function getAllCategories(): Promise<Category[]> {
  try {
    const response = await api.get<PaginatedCategoriesApiResponse>(
      "/categories",
      { params: { limit: 500, status: "active" } },
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
): Promise<CreateCategoryResult> {
  if (!data.name?.trim()) {
    throw new Error("Category name is required");
  }

  try {
    const response = await api.post<CategoryResponse>("/categories", data);
    return {
      category: response.data.category,
      restored: response.data.restored,
    };
  } catch (error) {
    if (
      error instanceof AxiosError &&
      error.response?.status === 409 &&
      (
        error.response.data as {
          existingCategory?: { id: string; name: string };
        }
      )?.existingCategory
    ) {
      const existingCategory = (
        error.response.data as {
          existingCategory: { id: string; name: string };
        }
      ).existingCategory;
      const e = new Error(
        getApiErrorMessage(error, "create category"),
      ) as Error & { existingCategory?: { id: string; name: string } };
      e.existingCategory = existingCategory;
      throw e;
    }
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
    if (
      error instanceof AxiosError &&
      error.response?.status === 409 &&
      (
        error.response.data as {
          existingCategory?: { id: string; name: string };
        }
      )?.existingCategory
    ) {
      const existingCategory = (
        error.response.data as {
          existingCategory: { id: string; name: string };
        }
      ).existingCategory;
      const e = new Error(
        getApiErrorMessage(error, `update category "${id}"`),
      ) as Error & { existingCategory?: { id: string; name: string } };
      e.existingCategory = existingCategory;
      throw e;
    }
    handleApiError(error, `update category "${id}"`);
  }
}

/**
 * Restore a deactivated category
 */
export async function restoreCategory(id: string): Promise<Category> {
  if (!id?.trim()) {
    throw new Error("Category ID is required");
  }

  try {
    const response = await api.post<CategoryResponse>(
      `/categories/${id}/restore`,
    );
    return response.data.category;
  } catch (error) {
    handleApiError(error, `restore category "${id}"`);
  }
}

/**
 * Delete a category (soft delete to platform trash)
 */
export async function deleteCategory(
  id: string,
  reason?: string,
): Promise<void> {
  if (!id?.trim()) {
    throw new Error("Category ID is required");
  }

  try {
    await api.delete(`/categories/${id}`, {
      data: reason ? { reason } : undefined,
    });
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
  reason?: string,
): Promise<void> {
  if (!categoryId?.trim()) {
    throw new Error("Category ID is required");
  }
  if (!name?.trim()) {
    throw new Error("Subcategory name is required");
  }

  try {
    await api.delete(`/categories/${categoryId}/subcategories`, {
      data: { name, ...(reason && { reason }) },
    });
  } catch (error) {
    handleApiError(error, "delete subcategory");
  }
}
