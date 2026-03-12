/**
 * Product Service
 *
 * Single source for product API calls. All product HTTP requests must go through this file.
 * Do not add React or UI logic.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import {
  type PaginationMeta,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/lib/apiTypes";
import { downloadBlobFromResponse } from "@/lib/downloadBlob";
import { validateExcelFile } from "@/lib/fileValidation";

// ============================================
// Types
// ============================================

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface ProductSubVariation {
  id: string;
  name: string;
}

export interface ProductVariation {
  id: string;
  productId: string;
  stockQuantity: number;
  createdAt?: string;
  /** Sub-variants (e.g. S, M, L); when present, stock is per sub-variant per location */
  subVariations?: ProductSubVariation[];
  /** EAV: attribute type + value for this variation */
  attributes?: Array<{
    attributeTypeId?: string;
    attributeValueId?: string;
    attributeType?: { id: string; name: string; code: string };
    attributeValue?: { id: string; value: string; code?: string | null };
  }>;
  photos?: Array<{
    id: string;
    photoUrl: string;
    isPrimary: boolean;
  }>;
  /** Per-location stock (when API includes it) for showing "which showroom has how much" */
  locationInventory?: Array<{
    quantity: number;
    subVariationId?: string | null;
    subVariation?: { id: string; name: string };
    location: { id: string; name: string; type: string };
  }>;
}

export interface Product {
  id: string;
  imsCode: string;
  name: string;
  categoryId: string;
  subCategory?: string;
  description?: string;
  length?: number;
  breadth?: number;
  height?: number;
  weight?: number;
  costPrice: number;
  mrp: number;
  vendorId?: string | null;
  createdById: string;
  dateCreated: string;
  category?: Category;
  createdBy?: {
    id: string;
    username: string;
    role: string;
  };
  variations?: ProductVariation[];
  /** EAV: which attribute types this product uses */
  productAttributeTypes?: Array<{
    attributeType: { id: string; name: string; code: string };
  }>;
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
  locationId?: string;
  categoryId?: string;
  subCategoryId?: string;
  subCategory?: string;
  vendorId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  /** When true, only products with at least one location inventory quantity below threshold (e.g. 5). */
  lowStock?: boolean;
}

export type { PaginationMeta } from "@/lib/apiTypes";

export interface PaginatedProductsResponse {
  data: Product[];
  pagination: PaginationMeta;
}

export interface CreateProductData {
  imsCode: string;
  name: string;
  categoryId: string;
  description?: string;
  subCategory?: string;
  length?: number;
  breadth?: number;
  height?: number;
  weight?: number;
  costPrice: number;
  mrp: number;
  vendorId?: string;
  /** Default location for new product stock (warehouse). If omitted, API uses location marked as default warehouse. */
  defaultLocationId?: string;
  /** EAV: attribute type IDs to apply to this product (e.g. Color, Size). */
  attributeTypeIds?: string[];
  variations?: Array<{
    stockQuantity?: number;
    attributes?: Array<{ attributeTypeId: string; attributeValueId: string }>;
    subVariants?: string[];
    photos?: Array<{
      photoUrl: string;
      isPrimary?: boolean;
    }>;
  }>;
  discounts?: Array<{
    discountTypeId: string;
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
  subCategory?: string;
  length?: number;
  breadth?: number;
  height?: number;
  weight?: number;
  costPrice?: number;
  mrp?: number;
  vendorId?: string;
  attributeTypeIds?: string[];
  variations?: Array<{
    id?: string;
    stockQuantity?: number;
    locationId?: string;
    attributes?: Array<{ attributeTypeId: string; attributeValueId: string }>;
    subVariants?: string[];
    photos?: Array<{
      photoUrl: string;
      isPrimary?: boolean;
    }>;
  }>;
  discounts?: Array<{
    discountTypeId: string;
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

export interface DiscountType {
  id: string;
  name: string;
  description?: string | null;
  defaultPercentage?: number | null;
}

interface DiscountTypesResponse {
  message: string;
  data: DiscountType[];
  pagination?: PaginationMeta;
}

export interface DiscountTypeListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedDiscountTypesResponse {
  data: DiscountType[];
  pagination: PaginationMeta;
}

// ============================================
// API Functions
// ============================================

export { DEFAULT_PAGE, DEFAULT_LIMIT };
/** Product list default search (empty string). */
export const DEFAULT_SEARCH = "";

/**
 * Get all products with pagination and search support
 */
export async function getProducts(
  params: ProductListParams = {},
): Promise<PaginatedProductsResponse> {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    search = "",
    locationId,
    categoryId,
    subCategoryId,
    subCategory,
    vendorId,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    lowStock,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) {
    queryParams.set("search", search.trim());
  }
  if (locationId) {
    queryParams.set("locationId", locationId);
  }
  if (categoryId) {
    queryParams.set("categoryId", categoryId);
  }
  if (subCategoryId) {
    queryParams.set("subCategoryId", subCategoryId);
  }
  if (subCategory) {
    queryParams.set("subCategory", subCategory);
  }
  if (vendorId) {
    queryParams.set("vendorId", vendorId);
  }
  if (dateFrom) {
    queryParams.set("dateFrom", dateFrom);
  }
  if (dateTo) {
    queryParams.set("dateTo", dateTo);
  }
  if (sortBy) {
    queryParams.set("sortBy", sortBy);
  }
  if (sortOrder) {
    queryParams.set("sortOrder", sortOrder);
  }
  if (lowStock) {
    queryParams.set("lowStock", "1");
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
    const response = await api.get<ProductsApiResponse>("/products?limit=10");
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
 * Get product by IMS code (barcode) for POS – returns product with variations and optional location stock
 */
export async function getProductByImsCode(
  imsCode: string,
  options?: { locationId?: string },
): Promise<Product> {
  if (!imsCode?.trim()) {
    throw new Error("IMS code is required");
  }
  const params = new URLSearchParams({ imsCode: imsCode.trim() });
  if (options?.locationId) params.set("locationId", options.locationId);
  const response = await api.get<ProductResponse>(
    `/products/by-ims?${params.toString()}`,
  );
  return response.data.product;
}

/**
 * Create a new product
 */
export async function createProduct(data: CreateProductData): Promise<Product> {
  // Validation
  if (!(data.imsCode ?? "").trim()) {
    throw new Error("Product IMS code (barcode) is required");
  }
  if (!data.name?.trim()) {
    throw new Error("Product name is required");
  }
  if (!data.variations?.length) {
    throw new Error("At least one variation is required");
  }
  if (typeof data.costPrice !== "number" || data.costPrice < 0) {
    throw new Error("Valid cost price is required");
  }
  if (typeof data.mrp !== "number" || data.mrp < 0) {
    throw new Error("Valid MRP is required");
  }
  // MRP < cost price is allowed when user explicitly accepts (handled in ProductForm)

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
 * Delete a product (soft delete to platform trash)
 */
export async function deleteProduct(
  id: string,
  reason?: string,
): Promise<void> {
  if (!id?.trim()) {
    throw new Error("Product ID is required");
  }

  try {
    await api.delete(`/products/${id}`, {
      data: reason ? { reason } : undefined,
    });
  } catch (error) {
    handleApiError(error, `delete product "${id}"`);
  }
}

/**
 * Delete a single variation from a product
 */
export async function deleteVariation(
  productId: string,
  variationId: string,
): Promise<void> {
  if (!productId?.trim()) throw new Error("Product ID is required");
  if (!variationId?.trim()) throw new Error("Variation ID is required");

  try {
    await api.delete(`/products/${productId}/variations/${variationId}`);
  } catch (error) {
    handleApiError(error, `delete variation "${variationId}"`);
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
 * Get all discount types (tenant-scoped). Uses limit=100 to fetch all for dropdowns.
 */
export async function getAllDiscountTypes(): Promise<DiscountType[]> {
  try {
    const response = await api.get<DiscountTypesResponse>(
      "/products/discount-types/list",
      { params: { limit: 100 } },
    );
    return response.data.data || [];
  } catch (error) {
    handleApiError(error, "fetch discount types");
  }
}

/**
 * Get discount types with pagination (for discount types section on discount page).
 */
export async function getDiscountTypesPaginated(
  params: DiscountTypeListParams = {},
): Promise<PaginatedDiscountTypesResponse> {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    search = "",
    sortBy,
    sortOrder,
  } = params;
  try {
    const response = await api.get<{
      message: string;
      data: DiscountType[];
      pagination: PaginationMeta;
    }>("/products/discount-types/list", {
      params: {
        page,
        limit,
        ...(search?.trim() && { search: search.trim() }),
        ...(sortBy && { sortBy }),
        ...(sortOrder && { sortOrder }),
      },
    });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch discount types");
  }
}

export interface CreateDiscountTypeData {
  name: string;
  description?: string;
  defaultPercentage?: number;
}

export interface UpdateDiscountTypeData {
  name?: string;
  description?: string;
  defaultPercentage?: number;
}

export async function createDiscountType(
  data: CreateDiscountTypeData,
): Promise<{ discountType: DiscountType }> {
  const response = await api.post<{
    message: string;
    discountType: DiscountType;
  }>("/products/discount-types", data);
  return { discountType: response.data.discountType };
}

export async function updateDiscountType(
  id: string,
  data: UpdateDiscountTypeData,
): Promise<{ discountType: DiscountType }> {
  const response = await api.put<{
    message: string;
    discountType: DiscountType;
  }>(`/products/discount-types/${id}`, data);
  return { discountType: response.data.discountType };
}

export async function deleteDiscountType(id: string): Promise<void> {
  await api.delete(`/products/discount-types/${id}`);
}

// ============================================
// Product Discounts List (for discounts page)
// ============================================

export interface ProductDiscountListItem {
  id: string;
  productId: string;
  discountTypeId: string;
  discountPercentage: number;
  valueType: string;
  value: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  product: {
    id: string;
    name: string;
    imsCode: string;
    categoryId: string;
    subCategory: string | null;
    subCategoryId: string | null;
    category: { id: string; name: string };
  };
  discountType: { id: string; name: string };
}

export interface ProductDiscountListParams {
  page?: number;
  limit?: number;
  search?: string;
  productId?: string;
  categoryId?: string;
  subCategoryId?: string;
  discountTypeId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedProductDiscountsResponse {
  data: ProductDiscountListItem[];
  pagination: PaginationMeta;
}

/** Discount for sale item selection (from GET /products/:id/discounts) */
export interface ProductDiscountForSale {
  id: string;
  name: string;
  value: number;
  valueType: "PERCENTAGE" | "FLAT";
  discountType: string;
  discountTypeId: string;
  startDate: string | null;
  endDate: string | null;
}

/**
 * Get active discounts for a product (for sale item discount selection).
 * Returns empty array on error (e.g. product not found) so callers can fall back.
 */
export async function getProductDiscounts(
  productId: string,
): Promise<ProductDiscountForSale[]> {
  if (!productId?.trim()) return [];
  try {
    const response = await api.get<{
      message: string;
      discounts: ProductDiscountForSale[];
    }>(`/products/${productId}/discounts`);
    return response.data.discounts ?? [];
  } catch {
    return [];
  }
}

export async function getProductDiscountsList(
  params: ProductDiscountListParams = {},
): Promise<PaginatedProductDiscountsResponse> {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    search = "",
    productId,
    categoryId,
    subCategoryId,
    discountTypeId,
    sortBy,
    sortOrder,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) {
    queryParams.set("search", search.trim());
  }
  if (productId) {
    queryParams.set("productId", productId);
  }
  if (categoryId) {
    queryParams.set("categoryId", categoryId);
  }
  if (subCategoryId) {
    queryParams.set("subCategoryId", subCategoryId);
  }
  if (discountTypeId) {
    queryParams.set("discountTypeId", discountTypeId);
  }
  if (sortBy) {
    queryParams.set("sortBy", sortBy);
  }
  if (sortOrder) {
    queryParams.set("sortOrder", sortOrder);
  }

  try {
    const response = await api.get<{
      message: string;
      data: ProductDiscountListItem[];
      pagination: PaginationMeta;
    }>(`/products/discounts/list?${queryParams.toString()}`);
    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch product discounts");
  }
}

// ============================================
// Bulk Upload Types
// ============================================

export interface BulkUploadError {
  row: number;
  field?: string;
  message: string;
  value?: unknown;
}

export interface BulkUploadSummary {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface UpdatedProduct {
  imsCode: string;
  name: string;
  locations: string[];
  inventoryRowsUpdated: number;
}

export interface CreatedProduct {
  id: string;
  imsCode: string;
  name: string;
  variationsCount: number;
}

export interface SkippedProduct {
  imsCode: string;
  name: string;
  reason: string;
}

export interface BulkUploadResponse {
  message: string;
  summary: BulkUploadSummary;
  created: CreatedProduct[];
  updated: UpdatedProduct[];
  skipped: SkippedProduct[];
  errors: BulkUploadError[];
}

/**
 * Bulk upload products from Excel file
 * @param file - Excel file to upload
 * @param onProgress - Optional callback for upload progress (0-100)
 */
export async function bulkUploadProducts(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<BulkUploadResponse> {
  if (!file) {
    throw new Error("File is required");
  }

  validateExcelFile(file);

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<BulkUploadResponse>(
      "/bulk/upload/products",
      formData,
      {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            onProgress(progress);
          }
        },
      },
    );

    return response.data;
  } catch (error: unknown) {
    const axiosError = error as {
      isAxiosError?: boolean;
      response?: {
        status?: number;
        data?: {
          message?: string;
          missingColumns?: string[];
          hint?: string;
          foundColumns?: string[];
        };
      };
    };
    if (
      axiosError?.isAxiosError &&
      axiosError.response?.status === 400 &&
      axiosError.response?.data
    ) {
      const data = axiosError.response.data;
      const err = new Error(data?.message || "Validation failed") as Error & {
        responseData?: typeof data;
      };
      err.responseData = data;
      throw err;
    }
    handleApiError(error, "bulk upload products");
  }
}

/**
 * Params for filtering the product export (same as list filters).
 * When productIds is not provided, only products matching these filters are exported.
 */
export interface ProductDownloadFilters {
  search?: string;
  locationId?: string;
  categoryId?: string;
  subCategoryId?: string;
  subCategory?: string;
  vendorId?: string;
  dateFrom?: string;
  dateTo?: string;
  lowStock?: boolean;
}

/**
 * Download products as Excel or CSV
 * @param format - Export format: 'excel' or 'csv'
 * @param productIds - Optional array of product IDs to export. If provided, only these products are exported.
 * @param filters - When productIds is not provided, only products matching these filters are exported. Omit to export all.
 */
export async function downloadProducts(
  format: "excel" | "csv" = "excel",
  productIds?: string[],
  filters?: ProductDownloadFilters,
): Promise<void> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.set("format", format);

    if (productIds && productIds.length > 0) {
      queryParams.set("ids", productIds.join(","));
    } else if (filters) {
      if (filters.search) queryParams.set("search", filters.search);
      if (filters.locationId) queryParams.set("locationId", filters.locationId);
      if (filters.categoryId) queryParams.set("categoryId", filters.categoryId);
      if (filters.subCategoryId)
        queryParams.set("subCategoryId", filters.subCategoryId);
      if (filters.subCategory)
        queryParams.set("subCategory", filters.subCategory);
      if (filters.vendorId) queryParams.set("vendorId", filters.vendorId);
      if (filters.dateFrom) queryParams.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) queryParams.set("dateTo", filters.dateTo);
      if (filters.lowStock === true) queryParams.set("lowStock", "true");
    }

    queryParams.set("type", "products");
    const response = await api.get<Blob>(
      `/bulk/download?${queryParams.toString()}`,
      { responseType: "blob" },
    );

    const defaultFilename = `products_${new Date().toISOString().split("T")[0]}.${
      format === "excel" ? "xlsx" : "csv"
    }`;
    downloadBlobFromResponse(response, defaultFilename);
  } catch (error) {
    handleApiError(error, "download products");
    throw error;
  }
}

/**
 * Download bulk upload template (Excel with headers only)
 */
export async function downloadBulkUploadTemplate(): Promise<void> {
  try {
    const response = await api.get<Blob>("/bulk/template?type=products", {
      responseType: "blob",
    });
    downloadBlobFromResponse(response, "products_bulk_upload_template.xlsx");
  } catch (error) {
    handleApiError(error, "download template");
    throw error;
  }
}
