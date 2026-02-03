"use client";

/**
 * React Query wrappers for sales. Business logic and API calls live in salesService; hooks only wire query/mutation and cache keys.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSales,
  getSaleById,
  getSalesSinceLastLogin,
  createSale,
  addPaymentToSale,
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
  type PaymentMethod,
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
  PaymentMethod,
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
  sinceLastLogin: (params: { page?: number; limit?: number }) =>
    [...salesKeys.all, "since-last-login", params] as const,
};

// ============================================
// Sales Hooks
// ============================================

/**
 * Hook for fetching paginated sales with filtering.
 * Pass enabled: false to skip fetch (e.g. drill-down closed).
 */
export function useSalesPaginated(
  params: SalesListParams & { enabled?: boolean } = {},
) {
  const { enabled = true, ...rest } = params;
  const normalizedParams: SalesListParams = {
    page: rest.page ?? DEFAULT_PAGE,
    limit: rest.limit ?? DEFAULT_LIMIT,
    locationId: rest.locationId,
    createdById: rest.createdById,
    type: rest.type,
    isCreditSale: rest.isCreditSale,
    startDate: rest.startDate,
    endDate: rest.endDate,
    search: rest.search?.trim() || "",
    sortBy: rest.sortBy ?? "createdAt",
    sortOrder: rest.sortOrder ?? "desc",
  };

  return useQuery({
    queryKey: salesKeys.list(normalizedParams),
    queryFn: () => getSales(normalizedParams),
    placeholderData: (previousData) => previousData,
    enabled,
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
 * Hook for fetching current user's sales since last login (User Sales Report)
 */
export function useSalesSinceLastLogin(params: {
  page?: number;
  limit?: number;
} = {}) {
  const normalizedParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
  };
  return useQuery({
    queryKey: salesKeys.sinceLastLogin(normalizedParams),
    queryFn: () => getSalesSinceLastLogin(normalizedParams),
    placeholderData: (previousData) => previousData,
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
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      queryClient.refetchQueries({ queryKey: salesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesKeys.analytics() });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

/**
 * Hook for adding a payment to a credit sale
 */
export function useAddPaymentToSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      saleId,
      method,
      amount,
    }: {
      saleId: string;
      method: PaymentMethod;
      amount: number;
    }) => addPaymentToSale(saleId, method, amount),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: salesKeys.detail(variables.saleId),
      });
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
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
