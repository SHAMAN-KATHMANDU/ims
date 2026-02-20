/**
 * Inventory Service
 *
 * Service layer for inventory management across locations.
 * Uses the shared axios instance from lib/axios.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";
import { type PaginationMeta, DEFAULT_PAGE } from "@/lib/apiTypes";
import type { Location, LocationType } from "./locationService";

// ============================================
// Types
// ============================================

export interface LocationInventoryItem {
  id: string;
  locationId: string;
  variationId: string;
  subVariationId?: string | null;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  variation: {
    id: string;
    imsCode: string;
    color: string;
    product: {
      id: string;
      name: string;
      mrp?: number | string;
      category?: {
        id: string;
        name: string;
      };
    };
    photos?: Array<{
      id: string;
      photoUrl: string;
      isPrimary: boolean;
    }>;
  };
  subVariation?: { id: string; name: string };
}

export interface LocationInventoryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}

export interface PaginatedInventoryResponse {
  location: {
    id: string;
    name: string;
    type: LocationType;
  };
  data: LocationInventoryItem[];
  pagination: PaginationMeta;
}

export interface ProductStockByLocation {
  location: {
    id: string;
    name: string;
    type: LocationType;
  };
  variations: Array<{
    variationId: string;
    color: string;
    subVariationId?: string;
    subVariation?: { id: string; name: string };
    quantity: number;
  }>;
  totalQuantity: number;
}

export interface ProductStockResponse {
  product: {
    id: string;
    imsCode: string;
    name: string;
    category?: {
      id: string;
      name: string;
    };
  };
  totalStock: number;
  inventoryByLocation: ProductStockByLocation[];
}

export interface InventorySummary {
  summary: {
    totalLocations: number;
    totalItems: number;
    totalQuantity: number;
  };
  locationStats: Array<{
    id: string;
    name: string;
    type: LocationType;
    totalItems: number;
    totalQuantity: number;
  }>;
}

export interface AdjustInventoryData {
  locationId: string;
  variationId: string;
  quantity: number;
  reason?: string;
}

export interface SetInventoryData {
  locationId: string;
  variationId: string;
  quantity: number;
}

interface InventoryApiResponse {
  message: string;
  location: Location;
  data: LocationInventoryItem[];
  pagination: PaginationMeta;
}

interface ProductStockApiResponse {
  message: string;
  product: {
    id: string;
    imsCode: string;
    name: string;
    category?: {
      id: string;
      name: string;
    };
  };
  totalStock: number;
  inventoryByLocation: ProductStockByLocation[];
}

interface InventorySummaryApiResponse {
  message: string;
  summary: {
    totalLocations: number;
    totalItems: number;
    totalQuantity: number;
  };
  locationStats: Array<{
    id: string;
    name: string;
    type: LocationType;
    totalItems: number;
    totalQuantity: number;
  }>;
}

/** Default limit for inventory list (larger than generic DEFAULT_LIMIT). */
const INVENTORY_DEFAULT_LIMIT = 20;

// ============================================
// API Functions
// ============================================

export { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

/**
 * Get inventory for a specific location
 */
export async function getLocationInventory(
  locationId: string,
  params: LocationInventoryParams = {},
): Promise<PaginatedInventoryResponse> {
  if (!locationId?.trim()) {
    throw new Error("Location ID is required");
  }

  const {
    page = DEFAULT_PAGE,
    limit = INVENTORY_DEFAULT_LIMIT,
    search = "",
    categoryId,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) {
    queryParams.set("search", search.trim());
  }
  if (categoryId) {
    queryParams.set("categoryId", categoryId);
  }

  try {
    const response = await api.get<InventoryApiResponse>(
      `/inventory/location/${locationId}?${queryParams.toString()}`,
    );
    return {
      location: {
        id: response.data.location.id,
        name: response.data.location.name,
        type: response.data.location.type,
      },
      data: response.data.data || [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch location inventory");
  }
}

/**
 * Get stock for a specific product across all locations
 */
export async function getProductStock(
  productId: string,
): Promise<ProductStockResponse> {
  if (!productId?.trim()) {
    throw new Error("Product ID is required");
  }

  try {
    const response = await api.get<ProductStockApiResponse>(
      `/inventory/product/${productId}`,
    );
    return {
      product: response.data.product,
      totalStock: response.data.totalStock,
      inventoryByLocation: response.data.inventoryByLocation || [],
    };
  } catch (error) {
    handleApiError(error, `fetch product stock "${productId}"`);
  }
}

/**
 * Get inventory summary across all locations
 */
export async function getInventorySummary(): Promise<InventorySummary> {
  try {
    const response =
      await api.get<InventorySummaryApiResponse>("/inventory/summary");
    return {
      summary: response.data.summary,
      locationStats: response.data.locationStats || [],
    };
  } catch (error) {
    handleApiError(error, "fetch inventory summary");
  }
}

/**
 * Adjust inventory quantity (add or subtract)
 */
export async function adjustInventory(data: AdjustInventoryData): Promise<{
  locationId: string;
  locationName: string;
  product: { id: string; imsCode: string; name: string };
  color: string;
  previousQuantity: number;
  adjustmentAmount: number;
  newQuantity: number;
  reason: string;
}> {
  if (!data.locationId?.trim()) {
    throw new Error("Location ID is required");
  }
  if (!data.variationId?.trim()) {
    throw new Error("Variation ID is required");
  }
  if (typeof data.quantity !== "number") {
    throw new Error("Quantity is required");
  }

  try {
    const response = await api.put<{
      message: string;
      adjustment: {
        locationId: string;
        locationName: string;
        product: { id: string; imsCode: string; name: string };
        color: string;
        previousQuantity: number;
        adjustmentAmount: number;
        newQuantity: number;
        reason: string;
      };
    }>("/inventory/adjust", data);
    return response.data.adjustment;
  } catch (error) {
    handleApiError(error, "adjust inventory");
  }
}

/**
 * Set inventory quantity to an absolute value
 */
export async function setInventory(data: SetInventoryData): Promise<{
  id: string;
  locationId: string;
  locationName: string;
  product: { id: string; imsCode: string; name: string };
  color: string;
  quantity: number;
}> {
  if (!data.locationId?.trim()) {
    throw new Error("Location ID is required");
  }
  if (!data.variationId?.trim()) {
    throw new Error("Variation ID is required");
  }
  if (typeof data.quantity !== "number" || data.quantity < 0) {
    throw new Error("Quantity must be a non-negative number");
  }

  try {
    const response = await api.put<{
      message: string;
      inventory: {
        id: string;
        locationId: string;
        locationName: string;
        product: { id: string; imsCode: string; name: string };
        color: string;
        quantity: number;
      };
    }>("/inventory/set", data);
    return response.data.inventory;
  } catch (error) {
    handleApiError(error, "set inventory");
  }
}
