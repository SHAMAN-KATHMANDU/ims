/**
 * Products feature types.
 * Re-exports and extends types from product.service for public API.
 */

import type { PaginationMeta } from "@/lib/apiTypes";

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface ProductVariation {
  id: string;
  productId: string;
  stockQuantity: number;
  subVariations?: Array<{ id: string; name: string }>;
  attributes?: Array<{
    attributeType?: { id: string; name: string; code: string };
    attributeValue?: { id: string; value: string; code?: string | null };
  }>;
  photos?: Array<{ id: string; photoUrl: string; isPrimary: boolean }>;
  locationInventory?: Array<{
    quantity: number;
    subVariationId?: string | null;
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
  costPrice: number;
  mrp: number;
  vendorId?: string | null;
  dateCreated: string;
  category?: Category;
  variations?: ProductVariation[];
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  vendorId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedProductsResponse {
  data: Product[];
  pagination: PaginationMeta;
}

export interface CreateProductData {
  imsCode?: string;
  name: string;
  categoryId: string;
  description?: string;
  costPrice: number;
  mrp: number;
  vendorId?: string | null;
}
