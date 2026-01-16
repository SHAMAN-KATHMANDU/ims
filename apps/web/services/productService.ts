/**
 * Product Service
 *
 * Service layer for product management operations
 * Follows MVC pattern - this is the Model/Controller layer
 * Handles all API calls related to products
 */

import { useAxios } from "@/hooks/useAxios";

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface ProductVariation {
  id: string;
  productId: string;
  color: string;
  stockQuantity: number;
  createdAt?: string;
  photos?: Array<{
    id: string;
    photoUrl: string;
    isPrimary: boolean;
  }>;
}

export interface Product {
  id: string;
  imsCode: string;
  name: string;
  categoryId: string;
  description?: string;
  length?: number;
  breadth?: number;
  height?: number;
  weight?: number;
  costPrice: number;
  mrp: number;
  createdById: string;
  dateCreated: string;
  category?: Category;
  createdBy?: {
    id: string;
    username: string;
    role: string;
  };
  variations?: ProductVariation[];
  discounts?: Array<{
    id: string;
    discountTypeId: string;
    discountPercentage: number;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
    discountType?: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
}

export interface CreateProductData {
  imsCode: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  length?: number;
  breadth?: number;
  height?: number;
  weight?: number;
  costPrice: number;
  mrp: number;
  variations?: Array<{
    color: string;
    stockQuantity?: number;
    photos?: Array<{
      photoUrl: string;
      isPrimary?: boolean;
    }>;
  }>;
  discounts?: Array<{
    discountTypeId?: string;
    discountTypeName?: string;
    discountPercentage: number;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  }>;
}

export interface UpdateProductData {
  imsCode?: string;
  name?: string;
  categoryId?: string;
  description?: string;
  length?: number;
  breadth?: number;
  height?: number;
  weight?: number;
  costPrice?: number;
  mrp?: number;
  variations?: Array<{
    color: string;
    stockQuantity?: number;
    photos?: Array<{
      photoUrl: string;
      isPrimary?: boolean;
    }>;
  }>;
  discounts?: Array<{
    discountTypeId?: string;
    discountTypeName?: string;
    discountPercentage: number;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  }>;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ProductsResponse {
  message: string;
  data: Product[];
  pagination: PaginationInfo;
}

export interface ProductResponse {
  message: string;
  product: Product;
}

export interface CategoriesResponse {
  message: string;
  categories: Category[];
  count: number;
}

/**
 * Product Service Class
 * Provides methods for all product-related API operations
 */
export class ProductService {
  private axios: ReturnType<typeof useAxios>;

  constructor(axiosInstance: ReturnType<typeof useAxios>) {
    this.axios = axiosInstance;
  }

  /**
   * Get all products (all authenticated users)
   */
  async getAllProducts(): Promise<Product[]> {
    try {
      const response = await this.axios.get<ProductsResponse>("/products");

      if (!response?.data) {
        throw new Error("Invalid response from server");
      }

      if (!Array.isArray(response.data.data)) {
        throw new Error("Invalid response format: data array not found");
      }

      return response.data.data || [];
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
          "Failed to fetch products";

        if (status === 401) {
          throw new Error("Unauthorized: Please log in to access products");
        } else if (status === 403) {
          throw new Error(
            "Forbidden: You don't have permission to access products",
          );
        } else if (status === 404) {
          throw new Error("Products endpoint not found");
        } else if (status && status >= 500) {
          throw new Error("Server error: Please try again later");
        }

        throw new Error(message);
      }

      // Re-throw if it's already a known error
      if (error instanceof Error) {
        throw error;
      }

      throw new Error("An unexpected error occurred while fetching products");
    }
  }

  /**
   * Get product by ID (all authenticated users)
   */
  async getProductById(id: string): Promise<Product> {
    try {
      if (!id || typeof id !== "string" || id.trim() === "") {
        throw new Error(
          "Product ID is required and must be a non-empty string",
        );
      }

      const response = await this.axios.get<ProductResponse>(`/products/${id}`);

      if (!response?.data) {
        throw new Error("Invalid response from server");
      }

      if (!response.data.product) {
        throw new Error("Product not found in response");
      }

      return response.data.product;
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
          "Failed to fetch product";

        if (status === 401) {
          throw new Error("Unauthorized: Please log in to access this product");
        } else if (status === 403) {
          throw new Error(
            "Forbidden: You don't have permission to access this product",
          );
        } else if (status === 404) {
          throw new Error(`Product with ID "${id}" not found`);
        } else if (status && status >= 500) {
          throw new Error("Server error: Please try again later");
        }

        throw new Error(message);
      }

      // Re-throw if it's already a known error
      if (error instanceof Error) {
        throw error;
      }

      throw new Error(
        "An unexpected error occurred while fetching the product",
      );
    }
  }

  /**
   * Create a new product (admin and superAdmin only)
   */
  async createProduct(data: CreateProductData): Promise<Product> {
    try {
      if (!data) {
        throw new Error("Product data is required");
      }

      if (
        !data.imsCode ||
        typeof data.imsCode !== "string" ||
        data.imsCode.trim() === ""
      ) {
        throw new Error(
          "Product IMS code is required and must be a non-empty string",
        );
      }

      if (
        !data.name ||
        typeof data.name !== "string" ||
        data.name.trim() === ""
      ) {
        throw new Error(
          "Product name is required and must be a non-empty string",
        );
      }

      if (typeof data.costPrice !== "number" || data.costPrice < 0) {
        throw new Error(
          "Product cost price is required and must be a non-negative number",
        );
      }

      if (typeof data.mrp !== "number" || data.mrp < 0) {
        throw new Error(
          "Product MRP is required and must be a non-negative number",
        );
      }

      if (data.mrp < data.costPrice) {
        throw new Error("Product MRP cannot be less than cost price");
      }

      const response = await this.axios.post<ProductResponse>(
        "/products",
        data,
      );

      if (!response?.data) {
        throw new Error("Invalid response from server");
      }

      if (!response.data.product) {
        throw new Error("Product not found in response");
      }

      return response.data.product;
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
          "Failed to create product";

        if (status === 400) {
          throw new Error(message || "Invalid product data provided");
        } else if (status === 401) {
          throw new Error("Unauthorized: Please log in to create products");
        } else if (status === 403) {
          throw new Error(
            "Forbidden: You don't have permission to create products",
          );
        } else if (status === 409) {
          throw new Error(
            message || "A product with this IMS code already exists",
          );
        } else if (status && status >= 500) {
          throw new Error("Server error: Please try again later");
        }

        throw new Error(message);
      }

      // Re-throw if it's already a known error
      if (error instanceof Error) {
        throw error;
      }

      throw new Error(
        "An unexpected error occurred while creating the product",
      );
    }
  }

  /**
   * Update a product (admin and superAdmin only)
   */
  async updateProduct(id: string, data: UpdateProductData): Promise<Product> {
    try {
      if (!id || typeof id !== "string" || id.trim() === "") {
        throw new Error(
          "Product ID is required and must be a non-empty string",
        );
      }

      if (!data || Object.keys(data).length === 0) {
        throw new Error(
          "Update data is required and must contain at least one field",
        );
      }

      if (
        data.imsCode !== undefined &&
        (typeof data.imsCode !== "string" || data.imsCode.trim() === "")
      ) {
        throw new Error(
          "Product IMS code must be a non-empty string if provided",
        );
      }

      if (
        data.name !== undefined &&
        (typeof data.name !== "string" || data.name.trim() === "")
      ) {
        throw new Error("Product name must be a non-empty string if provided");
      }

      if (
        data.costPrice !== undefined &&
        (typeof data.costPrice !== "number" || data.costPrice < 0)
      ) {
        throw new Error(
          "Product cost price must be a non-negative number if provided",
        );
      }

      if (
        data.mrp !== undefined &&
        (typeof data.mrp !== "number" || data.mrp < 0)
      ) {
        throw new Error(
          "Product MRP must be a non-negative number if provided",
        );
      }

      if (
        data.costPrice !== undefined &&
        data.mrp !== undefined &&
        data.mrp < data.costPrice
      ) {
        throw new Error("Product MRP cannot be less than cost price");
      }

      const response = await this.axios.put<ProductResponse>(
        `/products/${id}`,
        data,
      );

      if (!response?.data) {
        throw new Error("Invalid response from server");
      }

      if (!response.data.product) {
        throw new Error("Product not found in response");
      }

      return response.data.product;
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
          "Failed to update product";

        if (status === 400) {
          throw new Error(message || "Invalid product data provided");
        } else if (status === 401) {
          throw new Error("Unauthorized: Please log in to update products");
        } else if (status === 403) {
          throw new Error(
            "Forbidden: You don't have permission to update products",
          );
        } else if (status === 404) {
          throw new Error(`Product with ID "${id}" not found`);
        } else if (status && status >= 500) {
          throw new Error("Server error: Please try again later");
        }

        throw new Error(message);
      }

      // Re-throw if it's already a known error
      if (error instanceof Error) {
        throw error;
      }

      throw new Error(
        "An unexpected error occurred while updating the product",
      );
    }
  }

  /**
   * Delete a product (admin and superAdmin only)
   */
  async deleteProduct(id: string): Promise<void> {
    try {
      if (!id || typeof id !== "string" || id.trim() === "") {
        throw new Error(
          "Product ID is required and must be a non-empty string",
        );
      }

      await this.axios.delete(`/products/${id}`);
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
          "Failed to delete product";

        if (status === 401) {
          throw new Error("Unauthorized: Please log in to delete products");
        } else if (status === 403) {
          throw new Error(
            "Forbidden: You don't have permission to delete products",
          );
        } else if (status === 404) {
          throw new Error(`Product with ID "${id}" not found`);
        } else if (status === 409) {
          throw new Error(message || "Cannot delete product: It may be in use");
        } else if (status && status >= 500) {
          throw new Error("Server error: Please try again later");
        }

        throw new Error(message);
      }

      // Re-throw if it's already a known error
      if (error instanceof Error) {
        throw error;
      }

      throw new Error(
        "An unexpected error occurred while deleting the product",
      );
    }
  }

  /**
   * Get all categories (helper endpoint)
   */
  async getAllCategories(): Promise<Category[]> {
    try {
      const response = await this.axios.get<CategoriesResponse>(
        "/products/categories/list",
      );

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
        } else if (status && status >= 500) {
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
   * Get all discount types (helper endpoint)
   */
  async getAllDiscountTypes(): Promise<
    Array<{ id: string; name: string; description?: string }>
  > {
    try {
      const response = await this.axios.get<{
        message: string;
        data: Array<{
          id: string;
          name: string;
          description?: string;
        }>;
        pagination: {
          currentPage: number;
          totalPages: number;
          totalItems: number;
          itemsPerPage: number;
          hasNextPage: boolean;
          hasPrevPage: boolean;
        };
      }>("/products/discount-types/list");

      if (!response?.data) {
        throw new Error("Invalid response from server");
      }

      if (!Array.isArray(response.data.data)) {
        throw new Error("Invalid response format: data array not found");
      }

      return response.data.data || [];
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
          "Failed to fetch discount types";

        if (status === 401) {
          throw new Error(
            "Unauthorized: Please log in to access discount types",
          );
        } else if (status === 403) {
          throw new Error(
            "Forbidden: You don't have permission to access discount types",
          );
        } else if (status === 404) {
          throw new Error("Discount types endpoint not found");
        } else if (status && status >= 500) {
          throw new Error("Server error: Please try again later");
        }

        throw new Error(message);
      }

      // Re-throw if it's already a known error
      if (error instanceof Error) {
        throw error;
      }

      throw new Error(
        "An unexpected error occurred while fetching discount types",
      );
    }
  }
}
