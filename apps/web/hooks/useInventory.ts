"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getLocationInventory,
  getProductStock,
  getInventorySummary,
  adjustInventory,
  setInventory,
  type LocationInventoryItem,
  type LocationInventoryParams,
  type PaginatedInventoryResponse,
  type ProductStockResponse,
  type InventorySummary,
  type AdjustInventoryData,
  type SetInventoryData,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/services/inventoryService";
import { locationKeys } from "./useLocation";

// Re-export types for convenience
export type {
  LocationInventoryItem,
  LocationInventoryParams,
  PaginatedInventoryResponse,
  ProductStockResponse,
  InventorySummary,
  AdjustInventoryData,
  SetInventoryData,
};

// Re-export defaults
export { DEFAULT_PAGE, DEFAULT_LIMIT };

// ============================================
// Query Keys
// ============================================

export const inventoryKeys = {
  all: ["inventory"] as const,
  summary: () => [...inventoryKeys.all, "summary"] as const,
  location: (locationId: string) =>
    [...inventoryKeys.all, "location", locationId] as const,
  locationList: (locationId: string, params: LocationInventoryParams) =>
    [...inventoryKeys.location(locationId), params] as const,
  product: (productId: string) =>
    [...inventoryKeys.all, "product", productId] as const,
};

// ============================================
// Inventory Hooks
// ============================================

/**
 * Hook for fetching inventory summary across all locations
 */
export function useInventorySummary() {
  return useQuery({
    queryKey: inventoryKeys.summary(),
    queryFn: getInventorySummary,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for fetching inventory for a specific location
 */
export function useLocationInventory(
  locationId: string,
  params: LocationInventoryParams = {},
) {
  const normalizedParams: LocationInventoryParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    search: params.search?.trim() || "",
    categoryId: params.categoryId,
  };

  return useQuery({
    queryKey: inventoryKeys.locationList(locationId, normalizedParams),
    queryFn: () => getLocationInventory(locationId, normalizedParams),
    enabled: !!locationId,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for fetching stock for a specific product across all locations
 */
export function useProductStock(productId: string) {
  return useQuery({
    queryKey: inventoryKeys.product(productId),
    queryFn: () => getProductStock(productId),
    enabled: !!productId,
  });
}

/**
 * Hook for adjusting inventory quantity
 */
export function useAdjustInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AdjustInventoryData) => adjustInventory(data),
    onSuccess: (_, variables) => {
      // Invalidate inventory queries for the affected location
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.location(variables.locationId),
      });
      // Invalidate summary
      queryClient.invalidateQueries({ queryKey: inventoryKeys.summary() });
      // Invalidate location details
      queryClient.invalidateQueries({
        queryKey: locationKeys.detail(variables.locationId),
      });
    },
  });
}

/**
 * Hook for setting inventory quantity to an absolute value
 */
export function useSetInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SetInventoryData) => setInventory(data),
    onSuccess: (_, variables) => {
      // Invalidate inventory queries for the affected location
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.location(variables.locationId),
      });
      // Invalidate summary
      queryClient.invalidateQueries({ queryKey: inventoryKeys.summary() });
      // Invalidate location details
      queryClient.invalidateQueries({
        queryKey: locationKeys.detail(variables.locationId),
      });
    },
  });
}
