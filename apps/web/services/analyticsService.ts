/**
 * Analytics API calls. All analytics HTTP requests go through this file.
 * Uses shared filter params (dateFrom, dateTo, locationIds, etc.) from useAnalyticsFilters.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";

export interface AnalyticsApiParams {
  dateFrom?: string;
  dateTo?: string;
  locationIds?: string[];
  saleType?: string;
  creditStatus?: string;
  userId?: string;
  categoryId?: string;
  vendorId?: string;
}

// ============================================
// Sales & Revenue response types
// ============================================

export interface SalesRevenueKpis {
  totalRevenue: number;
  netRevenue: number;
  salesCount: number;
  avgOrderValue: number;
  totalDiscount: number;
  outstandingCredit: number;
}

export interface TimeSeriesPoint {
  date: string;
  gross: number;
  net: number;
  discount: number;
}

export interface CompositionByLocation {
  locationId: string;
  locationName: string;
  revenue: number;
  count: number;
}

export interface CompositionByPayment {
  method: string;
  revenue: number;
  count: number;
}

export interface CompositionBySaleType {
  type: string;
  revenue: number;
  count: number;
}

export interface CreditTimeSeriesPoint {
  date: string;
  issued: number;
  paid: number;
}

export interface CreditAging {
  "0-7": number;
  "8-30": number;
  "30+": number;
}

export interface UserPerformanceItem {
  userId: string;
  username: string;
  revenue: number;
  salesCount: number;
  avgDiscount: number;
}

export interface SalesRevenueData {
  kpis: SalesRevenueKpis;
  timeSeries: TimeSeriesPoint[];
  composition: {
    byLocation: CompositionByLocation[];
    byPaymentMethod: CompositionByPayment[];
    bySaleType: CompositionBySaleType[];
  };
  credit: {
    timeSeries: CreditTimeSeriesPoint[];
    aging: CreditAging;
  };
  userPerformance: UserPerformanceItem[];
}

function buildQueryString(params: AnalyticsApiParams): string {
  const search = new URLSearchParams();
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.locationIds?.length)
    search.set("locationIds", params.locationIds.join(","));
  if (params.saleType) search.set("saleType", params.saleType);
  if (params.creditStatus) search.set("creditStatus", params.creditStatus);
  if (params.userId) search.set("userId", params.userId);
  if (params.categoryId) search.set("categoryId", params.categoryId);
  if (params.vendorId) search.set("vendorId", params.vendorId);
  return search.toString();
}

/**
 * Fetch Sales & Revenue analytics (KPIs, time series, composition, credit, user performance).
 * Backend applies role: user sees only own sales.
 */
export async function getSalesRevenue(
  params: AnalyticsApiParams = {},
): Promise<SalesRevenueData> {
  const q = buildQueryString(params);
  try {
    const response = await api.get<{ message: string; data: SalesRevenueData }>(
      `/analytics/sales-revenue${q ? `?${q}` : ""}`,
    );
    return response.data.data;
  } catch (error) {
    handleApiError(error, "fetch sales revenue analytics");
  }
}

// ============================================
// Inventory & Operations response types
// ============================================

export interface InventoryOpsKpis {
  totalStockValueCost: number;
  totalStockValueMrp: number;
  lowStockCount: number;
  outOfStockCount: number;
  deadStockValue: number;
}

export interface HealthQuadrantPoint {
  velocity: number;
  quantity: number;
  name: string;
}

export interface TransferFunnelCounts {
  PENDING: number;
  APPROVED: number;
  IN_TRANSIT: number;
  COMPLETED: number;
}

export interface InventoryOpsData {
  kpis: InventoryOpsKpis;
  healthQuadrant: HealthQuadrantPoint[];
  heatmap: Array<Record<string, string | number>>;
  aging: { "0-30": number; "31-60": number; "61-90": number; "90+": number };
  transferFunnel: TransferFunnelCounts;
  avgTransferCompletionDays: number;
}

/**
 * Fetch Inventory & Operations analytics (admin/superAdmin).
 */
export async function getInventoryOps(
  params: AnalyticsApiParams = {},
): Promise<InventoryOpsData> {
  const q = buildQueryString(params);
  try {
    const response = await api.get<{ message: string; data: InventoryOpsData }>(
      `/analytics/inventory-ops${q ? `?${q}` : ""}`,
    );
    return response.data.data;
  } catch (error) {
    handleApiError(error, "fetch inventory ops analytics");
  }
}

// ============================================
// Customers & Promos response types
// ============================================

export interface MemberKpis {
  totalMembers: number;
  newInPeriod: number;
  repeatPercent: number;
}

export interface ProductPerformanceItem {
  productId: string;
  productName: string;
  revenue: number;
  quantity: number;
  margin: number;
}

export interface PromoEffectivenessItem {
  code: string;
  usageCount: number;
  value: number;
}

export interface CustomersPromosData {
  memberKpis: MemberKpis;
  cohort: unknown[];
  productPerformance: ProductPerformanceItem[];
  promoEffectiveness: {
    promos: PromoEffectivenessItem[];
    totalUsageCount: number;
  };
}

/**
 * Fetch Customers, Products & Promotions analytics (admin/superAdmin).
 */
export async function getCustomersPromos(
  params: AnalyticsApiParams = {},
): Promise<CustomersPromosData> {
  const q = buildQueryString(params);
  try {
    const response = await api.get<{
      message: string;
      data: CustomersPromosData;
    }>(`/analytics/customers-promos${q ? `?${q}` : ""}`);
    return response.data.data;
  } catch (error) {
    handleApiError(error, "fetch customers promos analytics");
  }
}
