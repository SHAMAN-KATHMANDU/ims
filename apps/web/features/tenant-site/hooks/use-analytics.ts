"use client";

import { useQuery } from "@tanstack/react-query";
import {
  analyticsService,
  type AnalyticsParams,
} from "../services/analytics.service";

export type {
  OverviewMetrics,
  SalesRevenueMetrics,
  InventoryOpsMetrics,
  CustomersPromosMetrics,
  TrendsMetrics,
  FinancialMetrics,
  DiscountMetrics,
  PaymentTrendsMetrics,
  LocationComparisonMetrics,
  MemberCohortMetrics,
  SalesExtendedMetrics,
  ProductInsightsMetrics,
  InventoryExtendedMetrics,
  CustomerInsightsMetrics,
} from "../services/analytics.service";

export const analyticsKeys = {
  all: ["analytics"] as const,
  overview: (params?: AnalyticsParams) =>
    [...analyticsKeys.all, "overview", params] as const,
  salesRevenue: (params?: AnalyticsParams) =>
    [...analyticsKeys.all, "salesRevenue", params] as const,
  inventoryOps: (params?: AnalyticsParams) =>
    [...analyticsKeys.all, "inventoryOps", params] as const,
  customersPromos: (params?: AnalyticsParams) =>
    [...analyticsKeys.all, "customersPromos", params] as const,
  discount: (params?: AnalyticsParams) =>
    [...analyticsKeys.all, "discount", params] as const,
  paymentTrends: (params?: AnalyticsParams) =>
    [...analyticsKeys.all, "paymentTrends", params] as const,
  locationComparison: (params?: AnalyticsParams) =>
    [...analyticsKeys.all, "locationComparison", params] as const,
  memberCohort: (params?: AnalyticsParams) =>
    [...analyticsKeys.all, "memberCohort", params] as const,
  salesExtended: (params?: AnalyticsParams) =>
    [...analyticsKeys.all, "salesExtended", params] as const,
  productInsights: (params?: AnalyticsParams) =>
    [...analyticsKeys.all, "productInsights", params] as const,
  inventoryExtended: (params?: AnalyticsParams) =>
    [...analyticsKeys.all, "inventoryExtended", params] as const,
  customerInsights: (params?: AnalyticsParams) =>
    [...analyticsKeys.all, "customerInsights", params] as const,
  trends: (params?: AnalyticsParams) =>
    [...analyticsKeys.all, "trends", params] as const,
  financial: (params?: AnalyticsParams) =>
    [...analyticsKeys.all, "financial", params] as const,
};

function getDateRange(days: number = 7) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    dateFrom: from.toISOString().split("T")[0],
    dateTo: to.toISOString().split("T")[0],
  };
}

export function useAnalyticsOverview(params?: AnalyticsParams) {
  const defaultParams = {
    ...getDateRange(7),
    ...params,
  };

  return useQuery({
    queryKey: analyticsKeys.overview(defaultParams),
    queryFn: () => analyticsService.getOverview(defaultParams),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSalesRevenueAnalytics(params?: AnalyticsParams) {
  const defaultParams = {
    ...getDateRange(30),
    ...params,
  };

  return useQuery({
    queryKey: analyticsKeys.salesRevenue(defaultParams),
    queryFn: () => analyticsService.getSalesRevenue(defaultParams),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInventoryOpsAnalytics(params?: AnalyticsParams) {
  const defaultParams = {
    ...getDateRange(30),
    ...params,
  };

  return useQuery({
    queryKey: analyticsKeys.inventoryOps(defaultParams),
    queryFn: () => analyticsService.getInventoryOps(defaultParams),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomersPromosAnalytics(params?: AnalyticsParams) {
  const defaultParams = {
    ...getDateRange(30),
    ...params,
  };

  return useQuery({
    queryKey: analyticsKeys.customersPromos(defaultParams),
    queryFn: () => analyticsService.getCustomersPromos(defaultParams),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDiscountAnalytics(params?: AnalyticsParams) {
  const defaultParams = {
    ...getDateRange(30),
    ...params,
  };

  return useQuery({
    queryKey: analyticsKeys.discount(defaultParams),
    queryFn: () => analyticsService.getDiscountAnalytics(defaultParams),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePaymentTrendsAnalytics(params?: AnalyticsParams) {
  const defaultParams = {
    ...getDateRange(30),
    ...params,
  };

  return useQuery({
    queryKey: analyticsKeys.paymentTrends(defaultParams),
    queryFn: () => analyticsService.getPaymentTrends(defaultParams),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLocationComparisonAnalytics(params?: AnalyticsParams) {
  const defaultParams = {
    ...getDateRange(30),
    ...params,
  };

  return useQuery({
    queryKey: analyticsKeys.locationComparison(defaultParams),
    queryFn: () => analyticsService.getLocationComparison(defaultParams),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMemberCohortAnalytics(params?: AnalyticsParams) {
  const defaultParams = {
    ...getDateRange(30),
    ...params,
  };

  return useQuery({
    queryKey: analyticsKeys.memberCohort(defaultParams),
    queryFn: () => analyticsService.getMemberCohort(defaultParams),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSalesExtendedAnalytics(params?: AnalyticsParams) {
  const defaultParams = {
    ...getDateRange(30),
    ...params,
  };

  return useQuery({
    queryKey: analyticsKeys.salesExtended(defaultParams),
    queryFn: () => analyticsService.getSalesExtended(defaultParams),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductInsightsAnalytics(params?: AnalyticsParams) {
  const defaultParams = {
    ...getDateRange(30),
    ...params,
  };

  return useQuery({
    queryKey: analyticsKeys.productInsights(defaultParams),
    queryFn: () => analyticsService.getProductInsights(defaultParams),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInventoryExtendedAnalytics(params?: AnalyticsParams) {
  const defaultParams = {
    ...getDateRange(30),
    ...params,
  };

  return useQuery({
    queryKey: analyticsKeys.inventoryExtended(defaultParams),
    queryFn: () => analyticsService.getInventoryExtended(defaultParams),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomerInsightsAnalytics(params?: AnalyticsParams) {
  const defaultParams = {
    ...getDateRange(30),
    ...params,
  };

  return useQuery({
    queryKey: analyticsKeys.customerInsights(defaultParams),
    queryFn: () => analyticsService.getCustomerInsights(defaultParams),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrendsAnalytics(params?: AnalyticsParams) {
  const defaultParams = {
    ...getDateRange(90),
    ...params,
  };

  return useQuery({
    queryKey: analyticsKeys.trends(defaultParams),
    queryFn: () => analyticsService.getTrends(defaultParams),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFinancialAnalytics(params?: AnalyticsParams) {
  const defaultParams = {
    ...getDateRange(30),
    ...params,
  };

  return useQuery({
    queryKey: analyticsKeys.financial(defaultParams),
    queryFn: () => analyticsService.getFinancial(defaultParams),
    staleTime: 5 * 60 * 1000,
  });
}
