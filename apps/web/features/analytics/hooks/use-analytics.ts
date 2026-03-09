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
  getSalesExtended,
  getProductInsights,
  getInventoryExtended,
  getCustomerInsights,
  getTrends,
  getFinancial,
  type SalesRevenueData,
  type InventoryOpsData,
  type CustomersPromosData,
  type DiscountAnalyticsData,
  type PaymentTrendsData,
  type LocationComparisonItem,
  type MemberCohortData,
  type SalesExtendedData,
  type ProductInsightsData,
  type InventoryExtendedData,
  type CustomerInsightsData,
  type TrendsData,
  type FinancialData,
  type AnalyticsApiParams,
} from "../services/analytics.service";

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
  salesExtended: (params: AnalyticsApiParams) =>
    [...analyticsKeys.all, "sales-extended", params] as const,
  productInsights: (params: AnalyticsApiParams) =>
    [...analyticsKeys.all, "product-insights", params] as const,
  inventoryExtended: (params: AnalyticsApiParams) =>
    [...analyticsKeys.all, "inventory-extended", params] as const,
  customerInsights: (params: AnalyticsApiParams) =>
    [...analyticsKeys.all, "customer-insights", params] as const,
  trends: (params: AnalyticsApiParams) =>
    [...analyticsKeys.all, "trends", params] as const,
  financial: (params: AnalyticsApiParams) =>
    [...analyticsKeys.all, "financial", params] as const,
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

/** Fetch Sales Extended analytics (growth, basket, peak hours, margin). */
export function useSalesExtendedAnalytics(apiParams: AnalyticsApiParams = {}) {
  return useQuery({
    queryKey: analyticsKeys.salesExtended(apiParams),
    queryFn: () => getSalesExtended(apiParams),
    staleTime: 2 * 60 * 1000,
  });
}

/** Fetch Product Insights (ABC, sell-through, co-purchase, category revenue). */
export function useProductInsightsAnalytics(
  apiParams: AnalyticsApiParams = {},
) {
  return useQuery({
    queryKey: analyticsKeys.productInsights(apiParams),
    queryFn: () => getProductInsights(apiParams),
    staleTime: 2 * 60 * 1000,
  });
}

/** Fetch Inventory Extended (turnover, DOH, dead stock, sell-through by location). */
export function useInventoryExtendedAnalytics(
  apiParams: AnalyticsApiParams = {},
) {
  return useQuery({
    queryKey: analyticsKeys.inventoryExtended(apiParams),
    queryFn: () => getInventoryExtended(apiParams),
    staleTime: 2 * 60 * 1000,
  });
}

/** Fetch Customer Insights (CLV, retention, churn, RFM, frequency, member growth). */
export function useCustomerInsightsAnalytics(
  apiParams: AnalyticsApiParams = {},
) {
  return useQuery({
    queryKey: analyticsKeys.customerInsights(apiParams),
    queryFn: () => getCustomerInsights(apiParams),
    staleTime: 2 * 60 * 1000,
  });
}

/** Fetch Trends (monthly totals, seasonality, cohort retention, peak hours). */
export function useTrendsAnalytics(apiParams: AnalyticsApiParams = {}) {
  return useQuery({
    queryKey: analyticsKeys.trends(apiParams),
    queryFn: () => getTrends(apiParams),
    staleTime: 2 * 60 * 1000,
  });
}

/** Fetch Financial (gross profit, COGS, margins). */
export function useFinancialAnalytics(apiParams: AnalyticsApiParams = {}) {
  return useQuery({
    queryKey: analyticsKeys.financial(apiParams),
    queryFn: () => getFinancial(apiParams),
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
  SalesExtendedData,
  ProductInsightsData,
  InventoryExtendedData,
  CustomerInsightsData,
  TrendsData,
  FinancialData,
  AnalyticsApiParams,
};
