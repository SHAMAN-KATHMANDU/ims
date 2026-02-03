/**
 * Location Service
 *
 * Single source for location (warehouse/showroom) API calls.
 * All location HTTP requests must go through this file. Do not add React or UI logic.
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

export type LocationType = "WAREHOUSE" | "SHOWROOM";

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  address?: string;
  isActive: boolean;
  isDefaultWarehouse?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    inventory: number;
    transfersFrom: number;
    transfersTo: number;
  };
}

export interface LocationListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: LocationType;
  activeOnly?: boolean;
}

export type { PaginationMeta };

export interface PaginatedLocationsResponse {
  data: Location[];
  pagination: PaginationMeta;
}

export interface CreateLocationData {
  name: string;
  type?: LocationType;
  address?: string;
  isDefaultWarehouse?: boolean;
}

export interface UpdateLocationData {
  name?: string;
  type?: LocationType;
  address?: string;
  isActive?: boolean;
  isDefaultWarehouse?: boolean;
}

interface LocationsApiResponse {
  message: string;
  data: Location[];
  pagination: PaginationMeta;
}

interface LocationResponse {
  message: string;
  location: Location;
}

// ============================================
// API Functions
// ============================================

export { DEFAULT_PAGE, DEFAULT_LIMIT };

/**
 * Get all locations with pagination and filtering
 */
export async function getLocations(
  params: LocationListParams = {},
): Promise<PaginatedLocationsResponse> {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    search = "",
    type,
    activeOnly,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) {
    queryParams.set("search", search.trim());
  }
  if (type) {
    queryParams.set("type", type);
  }
  if (activeOnly) {
    queryParams.set("activeOnly", "true");
  }

  try {
    const response = await api.get<LocationsApiResponse>(
      `/locations?${queryParams.toString()}`,
    );
    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch locations");
  }
}

/**
 * Get all active locations (convenience method)
 */
export async function getActiveLocations(): Promise<Location[]> {
  try {
    const response = await api.get<LocationsApiResponse>(
      "/locations?activeOnly=true&limit=100",
    );
    return response.data.data || [];
  } catch (error) {
    handleApiError(error, "fetch active locations");
  }
}

/**
 * Get location by ID
 */
export async function getLocationById(id: string): Promise<Location> {
  if (!id?.trim()) {
    throw new Error("Location ID is required");
  }

  try {
    const response = await api.get<LocationResponse>(`/locations/${id}`);
    return response.data.location;
  } catch (error) {
    handleApiError(error, `fetch location "${id}"`);
  }
}

/**
 * Create a new location
 */
export async function createLocation(
  data: CreateLocationData,
): Promise<Location> {
  if (!data.name?.trim()) {
    throw new Error("Location name is required");
  }

  try {
    const response = await api.post<LocationResponse>("/locations", data);
    return response.data.location;
  } catch (error) {
    handleApiError(error, "create location");
  }
}

/**
 * Update a location
 */
export async function updateLocation(
  id: string,
  data: UpdateLocationData,
): Promise<Location> {
  if (!id?.trim()) {
    throw new Error("Location ID is required");
  }
  if (!data || Object.keys(data).length === 0) {
    throw new Error("Update data is required");
  }

  try {
    const response = await api.put<LocationResponse>(`/locations/${id}`, data);
    return response.data.location;
  } catch (error) {
    handleApiError(error, `update location "${id}"`);
  }
}

/**
 * Delete (deactivate) a location
 */
export async function deleteLocation(id: string): Promise<void> {
  if (!id?.trim()) {
    throw new Error("Location ID is required");
  }

  try {
    await api.delete(`/locations/${id}`);
  } catch (error) {
    handleApiError(error, `delete location "${id}"`);
  }
}
