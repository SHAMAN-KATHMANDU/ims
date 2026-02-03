"use client";

/**
 * React Query wrappers for analytics. Filters come from useAnalyticsFilters (URL-based).
 */

import { useQuery } from "@tanstack/react-query";
import {
  getSalesRevenue,
  getInventoryOps,
  getCustomersPromos,
  getDiscountAnalytics,
  getPaymentTrends,
  getLocationComparison,
  getMemberCohort,
  type SalesRevenueData,
  type InventoryOpsData,
  type CustomersPromosData,
  type DiscountAnalyticsData,
  type PaymentTrendsData,
  type LocationComparisonItem,
  type MemberCohortData,
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
  discount: (params: AnalyticsApiParams) =>
    [...analyticsKeys.all, "discount", params] as const,
  paymentTrends: (params: AnalyticsApiParams) =>
    [...analyticsKeys.all, "payment-trends", params] as const,
  locationComparison: (params: AnalyticsApiParams) =>
    [...analyticsKeys.all, "location-comparison", params] as const,
  memberCohort: (params: AnalyticsApiParams) =>
    [...analyticsKeys.all, "member-cohort", params] as const,
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

/**
 * Fetch Discount analytics (over time, by user, by location).
 */
export function useDiscountAnalytics(apiParams: AnalyticsApiParams = {}) {
  return useQuery({
    queryKey: analyticsKeys.discount(apiParams),
    queryFn: () => getDiscountAnalytics(apiParams),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch Payment method trends over time.
 */
export function usePaymentTrendsAnalytics(apiParams: AnalyticsApiParams = {}) {
  return useQuery({
    queryKey: analyticsKeys.paymentTrends(apiParams),
    queryFn: () => getPaymentTrends(apiParams),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch Location comparison (revenue, sales count, discount per location).
 */
export function useLocationComparisonAnalytics(
  apiParams: AnalyticsApiParams = {},
) {
  return useQuery({
    queryKey: analyticsKeys.locationComparison(apiParams),
    queryFn: () => getLocationComparison(apiParams),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch Member cohort (new vs repeat counts and revenue). Admin/superAdmin only.
 */
export function useMemberCohortAnalytics(apiParams: AnalyticsApiParams = {}) {
  return useQuery({
    queryKey: analyticsKeys.memberCohort(apiParams),
    queryFn: () => getMemberCohort(apiParams),
    staleTime: 2 * 60 * 1000,
  });
}

export type {
  SalesRevenueData,
  InventoryOpsData,
  CustomersPromosData,
  DiscountAnalyticsData,
  PaymentTrendsData,
  LocationComparisonItem,
  MemberCohortData,
  AnalyticsApiParams,
};
