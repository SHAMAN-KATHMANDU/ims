"use client";

/**
 * React Query wrappers for analytics. Filters come from useAnalyticsFilters (URL-based).
 */

import { useQuery } from "@tanstack/react-query";
import {
  getSalesRevenue,
  getInventoryOps,
  getCustomersPromos,
  type SalesRevenueData,
  type InventoryOpsData,
  type CustomersPromosData,
  type AnalyticsApiParams,
} from "@/services/analyticsService";

export const analyticsKeys = {
  all: ["analytics"] as const,
  salesRevenue: (params: AnalyticsApiParams) =>
    [...analyticsKeys.all, "sales-revenue", params] as const,
  inventoryOps: (params: AnalyticsApiParams) =>
    [...analyticsKeys.all, "inventory-ops", params] as const,
  customersPromos: (params: AnalyticsApiParams) =>
    [...analyticsKeys.all, "customers-promos", params] as const,
};

/**
 * Fetch Sales & Revenue analytics. Pass apiParams from useAnalyticsFilters().apiParams.
 */
export function useSalesRevenueAnalytics(apiParams: AnalyticsApiParams = {}) {
  return useQuery({
    queryKey: analyticsKeys.salesRevenue(apiParams),
    queryFn: () => getSalesRevenue(apiParams),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch Inventory & Operations analytics (admin/superAdmin).
 */
export function useInventoryOpsAnalytics(apiParams: AnalyticsApiParams = {}) {
  return useQuery({
    queryKey: analyticsKeys.inventoryOps(apiParams),
    queryFn: () => getInventoryOps(apiParams),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch Customers, Products & Promotions analytics (admin/superAdmin).
 */
export function useCustomersPromosAnalytics(
  apiParams: AnalyticsApiParams = {},
) {
  return useQuery({
    queryKey: analyticsKeys.customersPromos(apiParams),
    queryFn: () => getCustomersPromos(apiParams),
    staleTime: 2 * 60 * 1000,
  });
}

export type {
  SalesRevenueData,
  InventoryOpsData,
  CustomersPromosData,
  AnalyticsApiParams,
};
