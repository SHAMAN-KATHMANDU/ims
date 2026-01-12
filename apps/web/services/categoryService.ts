/**
 * Category Service
 *
 * Service layer for category management operations
 * Follows MVC pattern - this is the Model/Controller layer
 */

import { useAxios } from "@/hooks/useAxios";

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
}

export interface CategoriesResponse {
  message: string;
  categories: Category[];
  count: number;
}

export interface CategoryResponse {
  message: string;
  category: Category;
}

/**
 * Category Service Class
 */
export class CategoryService {
  private axios: ReturnType<typeof useAxios>;

  constructor(axiosInstance: ReturnType<typeof useAxios>) {
    this.axios = axiosInstance;
  }

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<Category[]> {
    try {
      const response = await this.axios.get<CategoriesResponse>("/categories");

      if (!response?.data) {
        throw new Error("Invalid response from server");
      }

      if (!Array.isArray(response.data.categories)) {
        throw new Error("Invalid response format: categories array not found");
      }

      return response.data.categories;
    } catch (error: unknown) {
      // Handle network errors
      const err = error as {
        name?: string;
        message?: string;
        response?: { status?: number; data?: { message?: string } };
      };
      if (err.name === "TypeError" && err.message?.includes("fetch")) {
        throw new Error(
          "Cannot connect to server. Please check your network connection.",
        );
      }

      // Handle axios errors
      if (err.response) {
        const status = err.response.status;
        const message =
          err.response.data?.message ||
          err.message ||
          "Failed to fetch categories";

        if (status === 401) {
          throw new Error("Unauthorized: Please log in to access categories");
        } else if (status === 403) {
          throw new Error(
            "Forbidden: You don't have permission to access categories",
          );
        } else if (status === 404) {
          throw new Error("Categories endpoint not found");
        } else if (status !== undefined && status >= 500) {
          throw new Error("Server error: Please try again later");
        }

        throw new Error(message);
      }

      // Re-throw if it's already a known error
      if (error instanceof Error) {
        throw error;
      }

      throw new Error("An unexpected error occurred while fetching categories");
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<Category> {
    try {
      if (!id || typeof id !== "string" || id.trim() === "") {
        throw new Error(
          "Category ID is required and must be a non-empty string",
        );
      }

      const response = await this.axios.get<CategoryResponse>(
        `/categories/${id}`,
      );

      if (!response?.data) {
        throw new Error("Invalid response from server");
      }

      if (!response.data.category) {
        throw new Error("Category not found in response");
      }

      return response.data.category;
    } catch (error: unknown) {
      // Handle network errors
      const err = error as {
        name?: string;
        message?: string;
        response?: { status?: number; data?: { message?: string } };
      };
      if (err.name === "TypeError" && err.message?.includes("fetch")) {
        throw new Error(
          "Cannot connect to server. Please check your network connection.",
        );
      }

      // Handle axios errors
      if (err.response) {
        const status = err.response.status;
        const message =
          err.response.data?.message ||
          err.message ||
          "Failed to fetch category";

        if (status === 401) {
          throw new Error(
            "Unauthorized: Please log in to access this category",
          );
        } else if (status === 403) {
          throw new Error(
            "Forbidden: You don't have permission to access this category",
          );
        } else if (status === 404) {
          throw new Error(`Category with ID "${id}" not found`);
        } else if (status !== undefined && status >= 500) {
          throw new Error("Server error: Please try again later");
        }

        throw new Error(message);
      }

      // Re-throw if it's already a known error
      if (error instanceof Error) {
        throw error;
      }

      throw new Error(
        "An unexpected error occurred while fetching the category",
      );
    }
  }

  /**
   * Create a new category (admin and superAdmin only)
   */
  async createCategory(data: CreateCategoryData): Promise<Category> {
    try {
      if (!data) {
        throw new Error("Category data is required");
      }

      if (
        !data.name ||
        typeof data.name !== "string" ||
        data.name.trim() === ""
      ) {
        throw new Error(
          "Category name is required and must be a non-empty string",
        );
      }

      const response = await this.axios.post<CategoryResponse>(
        "/categories",
        data,
      );

      if (!response?.data) {
        throw new Error("Invalid response from server");
      }

      if (!response.data.category) {
        throw new Error("Category not found in response");
      }

      return response.data.category;
    } catch (error: unknown) {
      // Handle network errors
      const err = error as {
        name?: string;
        message?: string;
        response?: { status?: number; data?: { message?: string } };
      };
      if (err.name === "TypeError" && err.message?.includes("fetch")) {
        throw new Error(
          "Cannot connect to server. Please check your network connection.",
        );
      }

      // Handle axios errors
      if (err.response) {
        const status = err.response.status;
        const message =
          err.response.data?.message ||
          err.message ||
          "Failed to create category";

        if (status === 400) {
          throw new Error(message || "Invalid category data provided");
        } else if (status === 401) {
          throw new Error("Unauthorized: Please log in to create categories");
        } else if (status === 403) {
          throw new Error(
            "Forbidden: You don't have permission to create categories",
          );
        } else if (status === 409) {
          throw new Error(
            message || "A category with this name already exists",
          );
        } else if (status !== undefined && status >= 500) {
          throw new Error("Server error: Please try again later");
        }

        throw new Error(message);
      }

      // Re-throw if it's already a known error
      if (error instanceof Error) {
        throw error;
      }

      throw new Error(
        "An unexpected error occurred while creating the category",
      );
    }
  }

  /**
   * Update a category (admin and superAdmin only)
   */
  async updateCategory(
    id: string,
    data: UpdateCategoryData,
  ): Promise<Category> {
    try {
      if (!id || typeof id !== "string" || id.trim() === "") {
        throw new Error(
          "Category ID is required and must be a non-empty string",
        );
      }

      if (!data || Object.keys(data).length === 0) {
        throw new Error(
          "Update data is required and must contain at least one field",
        );
      }

      if (
        data.name !== undefined &&
        (typeof data.name !== "string" || data.name.trim() === "")
      ) {
        throw new Error("Category name must be a non-empty string if provided");
      }

      const response = await this.axios.put<CategoryResponse>(
        `/categories/${id}`,
        data,
      );

      if (!response?.data) {
        throw new Error("Invalid response from server");
      }

      if (!response.data.category) {
        throw new Error("Category not found in response");
      }

      return response.data.category;
    } catch (error: unknown) {
      // Handle network errors
      const err = error as {
        name?: string;
        message?: string;
        response?: { status?: number; data?: { message?: string } };
      };
      if (err.name === "TypeError" && err.message?.includes("fetch")) {
        throw new Error(
          "Cannot connect to server. Please check your network connection.",
        );
      }

      // Handle axios errors
      if (err.response) {
        const status = err.response.status;
        const message =
          err.response.data?.message ||
          err.message ||
          "Failed to update category";

        if (status === 400) {
          throw new Error(message || "Invalid category data provided");
        } else if (status === 401) {
          throw new Error("Unauthorized: Please log in to update categories");
        } else if (status === 403) {
          throw new Error(
            "Forbidden: You don't have permission to update categories",
          );
        } else if (status === 404) {
          throw new Error(`Category with ID "${id}" not found`);
        } else if (status !== undefined && status >= 500) {
          throw new Error("Server error: Please try again later");
        }

        throw new Error(message);
      }

      // Re-throw if it's already a known error
      if (error instanceof Error) {
        throw error;
      }

      throw new Error(
        "An unexpected error occurred while updating the category",
      );
    }
  }

  /**
   * Delete a category (admin and superAdmin only)
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      if (!id || typeof id !== "string" || id.trim() === "") {
        throw new Error(
          "Category ID is required and must be a non-empty string",
        );
      }

      await this.axios.delete(`/categories/${id}`);
    } catch (error: unknown) {
      // Handle network errors
      const err = error as {
        name?: string;
        message?: string;
        response?: { status?: number; data?: { message?: string } };
      };
      if (err.name === "TypeError" && err.message?.includes("fetch")) {
        throw new Error(
          "Cannot connect to server. Please check your network connection.",
        );
      }

      // Handle axios errors
      if (err.response) {
        const status = err.response.status;
        const message =
          err.response.data?.message ||
          err.message ||
          "Failed to delete category";

        if (status === 401) {
          throw new Error("Unauthorized: Please log in to delete categories");
        } else if (status === 403) {
          throw new Error(
            "Forbidden: You don't have permission to delete categories",
          );
        } else if (status === 404) {
          throw new Error(`Category with ID "${id}" not found`);
        } else if (status === 409) {
          throw new Error(
            message || "Cannot delete category: It may be in use by products",
          );
        } else if (status !== undefined && status >= 500) {
          throw new Error("Server error: Please try again later");
        }

        throw new Error(message);
      }

      // Re-throw if it's already a known error
      if (error instanceof Error) {
        throw error;
      }

      throw new Error(
        "An unexpected error occurred while deleting the category",
      );
    }
  }
}
