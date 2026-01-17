/**
 * Product Service
 *
 * Service layer for product management operations.
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

// ============================================
// Pagination Types
// ============================================

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedProductsResponse {
  data: Product[];
  pagination: PaginationMeta;
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

interface ProductsApiResponse {
  message: string;
  data: Product[];
  pagination: PaginationMeta;
}

interface ProductResponse {
  message: string;
  product: Product;
}

interface CategoriesResponse {
  message: string;
  categories: Category[];
  count: number;
}

interface DiscountTypesResponse {
  message: string;
  data: Array<{ id: string; name: string; description?: string }>;
  pagination: PaginationMeta;
}

// ============================================
// API Functions
// ============================================

/**
 * Default pagination values
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const DEFAULT_SEARCH = "";

/**
 * Get all products with pagination and search support
 */
export async function getProducts(
  params: ProductListParams = {},
): Promise<PaginatedProductsResponse> {
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, search = "" } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) {
    queryParams.set("search", search.trim());
  }

  try {
    const response = await api.get<ProductsApiResponse>(
      `/products?${queryParams.toString()}`,
    );
    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch products");
  }
}

/**
 * Get all products (without pagination - for backward compatibility)
 * @deprecated Use getProducts() with pagination instead
 */
export async function getAllProducts(): Promise<Product[]> {
  try {
    // Fetch with a large limit to get all products
    const response = await api.get<ProductsApiResponse>("/products?limit=1000");
    return response.data.data || [];
  } catch (error) {
    handleApiError(error, "fetch products");
  }
}

/**
 * Get product by ID
 */
export async function getProductById(id: string): Promise<Product> {
  if (!id?.trim()) {
    throw new Error("Product ID is required");
  }

  try {
    const response = await api.get<ProductResponse>(`/products/${id}`);
    return response.data.product;
  } catch (error) {
    handleApiError(error, `fetch product "${id}"`);
  }
}

/**
 * Create a new product
 */
export async function createProduct(data: CreateProductData): Promise<Product> {
  // Validation
  if (!data.imsCode?.trim()) {
    throw new Error("Product IMS code is required");
  }
  if (!data.name?.trim()) {
    throw new Error("Product name is required");
  }
  if (typeof data.costPrice !== "number" || data.costPrice < 0) {
    throw new Error("Valid cost price is required");
  }
  if (typeof data.mrp !== "number" || data.mrp < 0) {
    throw new Error("Valid MRP is required");
  }
  if (data.mrp < data.costPrice) {
    throw new Error("MRP cannot be less than cost price");
  }

  try {
    const response = await api.post<ProductResponse>("/products", data);
    return response.data.product;
  } catch (error) {
    handleApiError(error, "create product");
  }
}

/**
 * Update a product
 */
export async function updateProduct(
  id: string,
  data: UpdateProductData,
): Promise<Product> {
  if (!id?.trim()) {
    throw new Error("Product ID is required");
  }
  if (!data || Object.keys(data).length === 0) {
    throw new Error("Update data is required");
  }

  try {
    const response = await api.put<ProductResponse>(`/products/${id}`, data);
    return response.data.product;
  } catch (error) {
    handleApiError(error, `update product "${id}"`);
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string): Promise<void> {
  if (!id?.trim()) {
    throw new Error("Product ID is required");
  }

  try {
    await api.delete(`/products/${id}`);
  } catch (error) {
    handleApiError(error, `delete product "${id}"`);
  }
}

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<Category[]> {
  try {
    const response = await api.get<CategoriesResponse>(
      "/products/categories/list",
    );
    return response.data.categories || [];
  } catch (error) {
    handleApiError(error, "fetch categories");
  }
}

/**
 * Get all discount types
 */
export async function getAllDiscountTypes(): Promise<
  Array<{ id: string; name: string; description?: string }>
> {
  try {
    const response = await api.get<DiscountTypesResponse>(
      "/products/discount-types/list",
    );
    return response.data.data || [];
  } catch (error) {
    handleApiError(error, "fetch discount types");
  }
}
