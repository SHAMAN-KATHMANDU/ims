"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSales,
  getSaleById,
  createSale,
  getSalesSummary,
  getSalesByLocation,
  getDailySales,
  type Sale,
  type SaleItem,
  type SaleType,
  type SalesListParams,
  type PaginatedSalesResponse,
  type CreateSaleData,
  type SalesSummary,
  type LocationSalesStat,
  type DailySalesStat,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  getSaleTypeLabel,
  getSaleTypeColor,
  formatCurrency,
} from "@/services/salesService";

// Re-export types for convenience
export type {
  Sale,
  SaleItem,
  SaleType,
  SalesListParams,
  PaginatedSalesResponse,
  CreateSaleData,
  SalesSummary,
  LocationSalesStat,
  DailySalesStat,
};

// Re-export defaults and helpers
export {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  getSaleTypeLabel,
  getSaleTypeColor,
  formatCurrency,
};

// ============================================
// Query Keys
// ============================================

export const salesKeys = {
  all: ["sales"] as const,
  lists: () => [...salesKeys.all, "list"] as const,
  list: (params: SalesListParams) => [...salesKeys.lists(), params] as const,
  details: () => [...salesKeys.all, "detail"] as const,
  detail: (id: string) => [...salesKeys.details(), id] as const,
  analytics: () => [...salesKeys.all, "analytics"] as const,
  summary: (params: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
  }) => [...salesKeys.analytics(), "summary", params] as const,
  byLocation: (params: { startDate?: string; endDate?: string }) =>
    [...salesKeys.analytics(), "by-location", params] as const,
  daily: (params: { locationId?: string; days?: number }) =>
    [...salesKeys.analytics(), "daily", params] as const,
};

// ============================================
// Sales Hooks
// ============================================

/**
 * Hook for fetching paginated sales with filtering
 */
export function useSalesPaginated(params: SalesListParams = {}) {
  const normalizedParams: SalesListParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    locationId: params.locationId,
    type: params.type,
    startDate: params.startDate,
    endDate: params.endDate,
    search: params.search?.trim() || "",
  };

  return useQuery({
    queryKey: salesKeys.list(normalizedParams),
    queryFn: () => getSales(normalizedParams),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for fetching a single sale by ID with full details
 */
export function useSale(id: string) {
  return useQuery({
    queryKey: salesKeys.detail(id),
    queryFn: () => getSaleById(id),
    enabled: !!id,
  });
}

/**
 * Hook for creating a new sale
 */
export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSaleData) => createSale(data),
    onSuccess: () => {
      // Invalidate all sales lists
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      // Invalidate analytics
      queryClient.invalidateQueries({ queryKey: salesKeys.analytics() });
      // Invalidate inventory (since stock is deducted)
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

// ============================================
// Analytics Hooks
// ============================================

/**
 * Hook for fetching sales summary analytics
 */
export function useSalesSummary(
  params: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
  } = {},
) {
  return useQuery({
    queryKey: salesKeys.summary(params),
    queryFn: () => getSalesSummary(params),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for fetching sales by location analytics
 */
export function useSalesByLocation(
  params: {
    startDate?: string;
    endDate?: string;
  } = {},
) {
  return useQuery({
    queryKey: salesKeys.byLocation(params),
    queryFn: () => getSalesByLocation(params),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for fetching daily sales analytics
 */
export function useDailySales(
  params: {
    locationId?: string;
    days?: number;
  } = {},
) {
  return useQuery({
    queryKey: salesKeys.daily(params),
    queryFn: () => getDailySales(params),
    staleTime: 60 * 1000, // 1 minute
  });
}
