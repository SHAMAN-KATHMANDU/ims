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

// ============================================
// Discount analytics
// ============================================

export interface DiscountOverTimePoint {
  date: string;
  discount: number;
}

export interface DiscountByUser {
  userId: string;
  username: string;
  discount: number;
}

export interface DiscountByLocation {
  locationId: string;
  locationName: string;
  discount: number;
}

export interface DiscountAnalyticsData {
  discountOverTime: DiscountOverTimePoint[];
  byUser: DiscountByUser[];
  byLocation: DiscountByLocation[];
}

export async function getDiscountAnalytics(
  params: AnalyticsApiParams = {},
): Promise<DiscountAnalyticsData> {
  const q = buildQueryString(params);
  try {
    const response = await api.get<{
      message: string;
      data: DiscountAnalyticsData;
    }>(`/analytics/discount${q ? `?${q}` : ""}`);
    return response.data.data;
  } catch (error) {
    handleApiError(error, "fetch discount analytics");
  }
}

// ============================================
// Payment trends (time series by method)
// ============================================

export interface PaymentTrendsData {
  timeSeries: Array<Record<string, string | number>>;
}

export async function getPaymentTrends(
  params: AnalyticsApiParams = {},
): Promise<PaymentTrendsData> {
  const q = buildQueryString(params);
  try {
    const response = await api.get<{
      message: string;
      data: PaymentTrendsData;
    }>(`/analytics/payment-trends${q ? `?${q}` : ""}`);
    return response.data.data;
  } catch (error) {
    handleApiError(error, "fetch payment trends");
  }
}

// ============================================
// Location comparison
// ============================================

export interface LocationComparisonItem {
  locationId: string;
  locationName: string;
  revenue: number;
  salesCount: number;
  discount: number;
}

export async function getLocationComparison(
  params: AnalyticsApiParams = {},
): Promise<LocationComparisonItem[]> {
  const q = buildQueryString(params);
  try {
    const response = await api.get<{
      message: string;
      data: LocationComparisonItem[];
    }>(`/analytics/location-comparison${q ? `?${q}` : ""}`);
    return response.data.data;
  } catch (error) {
    handleApiError(error, "fetch location comparison");
  }
}

// ============================================
// Member cohort (new vs repeat)
// ============================================

export interface MemberCohortData {
  newCount: number;
  repeatCount: number;
  newRevenue: number;
  repeatRevenue: number;
}

export async function getMemberCohort(
  params: AnalyticsApiParams = {},
): Promise<MemberCohortData> {
  const q = buildQueryString(params);
  try {
    const response = await api.get<{
      message: string;
      data: MemberCohortData;
    }>(`/analytics/member-cohort${q ? `?${q}` : ""}`);
    return response.data.data;
  } catch (error) {
    handleApiError(error, "fetch member cohort");
  }
}

// ============================================
// Sales Extended response types
// ============================================

export interface MonthlyAggregate {
  month: string;
  gross: number;
  net: number;
  discount: number;
  count: number;
}

export interface GrowthRate {
  month: string;
  growthPct: number;
}

export interface DayOfWeekBucket {
  day: string;
  revenue: number;
  count: number;
}

export interface HourOfDayBucket {
  hour: number;
  revenue: number;
  count: number;
}

export interface SalesExtendedData {
  monthlyAggregates: MonthlyAggregate[];
  growthRates: GrowthRate[];
  basketMetrics: {
    avgBasketSize: number;
    totalItems: number;
    totalSales: number;
  };
  dayOfWeek: DayOfWeekBucket[];
  hourOfDay: HourOfDayBucket[];
  grossProfit: number;
  grossMargin: number;
  revenuePerMember: number;
  discountRatio: number;
}

export async function getSalesExtended(
  params: AnalyticsApiParams = {},
): Promise<SalesExtendedData> {
  const q = buildQueryString(params);
  try {
    const response = await api.get<{
      message: string;
      data: SalesExtendedData;
    }>(`/analytics/sales-extended${q ? `?${q}` : ""}`);
    return response.data.data;
  } catch (error) {
    handleApiError(error, "fetch sales extended analytics");
  }
}

// ============================================
// Product Insights response types
// ============================================

export interface AbcProduct {
  productId: string;
  name: string;
  revenue: number;
  quantity: number;
  cost: number;
  margin: number;
  categoryName: string;
  cumulativePct: number;
  grade: "A" | "B" | "C";
}

export interface SellThroughItem {
  productId: string;
  productName: string;
  unitsSold: number;
  currentStock: number;
  sellThroughRate: number;
}

export interface CoPurchasePair {
  product1: { id: string; name: string };
  product2: { id: string; name: string };
  frequency: number;
}

export interface RevenueByCategoryItem {
  category: string;
  revenue: number;
  cost: number;
  quantity: number;
  margin: number;
}

export interface ProductInsightsData {
  abcClassification: AbcProduct[];
  sellThroughRates: SellThroughItem[];
  coPurchasePairs: CoPurchasePair[];
  revenueByCategory: RevenueByCategoryItem[];
}

export async function getProductInsights(
  params: AnalyticsApiParams = {},
): Promise<ProductInsightsData> {
  const q = buildQueryString(params);
  try {
    const response = await api.get<{
      message: string;
      data: ProductInsightsData;
    }>(`/analytics/product-insights${q ? `?${q}` : ""}`);
    return response.data.data;
  } catch (error) {
    handleApiError(error, "fetch product insights");
  }
}

// ============================================
// Inventory Extended response types
// ============================================

export interface DaysOnHandItem {
  productId: string;
  productName: string;
  currentStock: number;
  dailySalesRate: number;
  daysOnHand: number;
}

export interface DeadStockItem {
  productId: string;
  productName: string;
  currentStock: number;
  stockValue: number;
}

export interface SellThroughByLocation {
  locationId: string;
  locationName: string;
  unitsSold: number;
  currentStock: number;
  sellThroughRate: number;
}

export interface InventoryExtendedData {
  turnoverRatio: number;
  stockToSalesRatio: number;
  daysOnHand: DaysOnHandItem[];
  deadStock: DeadStockItem[];
  sellThroughByLocation: SellThroughByLocation[];
}

export async function getInventoryExtended(
  params: AnalyticsApiParams = {},
): Promise<InventoryExtendedData> {
  const q = buildQueryString(params);
  try {
    const response = await api.get<{
      message: string;
      data: InventoryExtendedData;
    }>(`/analytics/inventory-extended${q ? `?${q}` : ""}`);
    return response.data.data;
  } catch (error) {
    handleApiError(error, "fetch inventory extended analytics");
  }
}

// ============================================
// Customer Insights response types
// ============================================

export interface ClvBucket {
  range: string;
  count: number;
}

export interface RfmSegment {
  segment: string;
  count: number;
  revenue: number;
}

export interface MemberGrowthPoint {
  month: string;
  count: number;
}

export interface NewVsReturningPoint {
  month: string;
  newRevenue: number;
  returningRevenue: number;
}

export interface CustomerInsightsData {
  clvDistribution: ClvBucket[];
  avgClv: number;
  retentionRate: number;
  churnRate: number;
  rfmSegments: RfmSegment[];
  avgOrderFrequencyDays: number;
  memberGrowth: MemberGrowthPoint[];
  newVsReturningTimeSeries: NewVsReturningPoint[];
}

export async function getCustomerInsights(
  params: AnalyticsApiParams = {},
): Promise<CustomerInsightsData> {
  const q = buildQueryString(params);
  try {
    const response = await api.get<{
      message: string;
      data: CustomerInsightsData;
    }>(`/analytics/customer-insights${q ? `?${q}` : ""}`);
    return response.data.data;
  } catch (error) {
    handleApiError(error, "fetch customer insights");
  }
}

// ============================================
// Trends response types
// ============================================

export interface MonthlyTotal {
  month: string;
  revenue: number;
  count: number;
  discount: number;
  momGrowth: number;
}

export interface SeasonalityPoint {
  month: string;
  index: number;
}

export interface CohortRetentionMonth {
  monthOffset: number;
  activeCount: number;
  rate: number;
}

export interface CohortRetentionRow {
  cohortMonth: string;
  size: number;
  retention: CohortRetentionMonth[];
}

export interface PeakHourDay {
  day: string;
  hours: Array<{ hour: number; revenue: number }>;
}

export interface TrendsData {
  monthlyTotals: MonthlyTotal[];
  seasonalityIndex: SeasonalityPoint[];
  cohortRetention: CohortRetentionRow[];
  peakHours: PeakHourDay[];
}

export async function getTrends(
  params: AnalyticsApiParams = {},
): Promise<TrendsData> {
  const q = buildQueryString(params);
  try {
    const response = await api.get<{ message: string; data: TrendsData }>(
      `/analytics/trends${q ? `?${q}` : ""}`,
    );
    return response.data.data;
  } catch (error) {
    handleApiError(error, "fetch trends analytics");
  }
}

// ============================================
// Financial response types
// ============================================

export interface GrossProfitPoint {
  date: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  discountRatio: number;
}

export interface CogsByCategoryItem {
  category: string;
  cogs: number;
  revenue: number;
}

export interface CogsByLocationItem {
  locationId: string;
  locationName: string;
  cogs: number;
}

export interface MarginByCategoryItem {
  category: string;
  revenue: number;
  cogs: number;
  margin: number;
  marginPct: number;
}

export interface FinancialData {
  grossProfitTimeSeries: GrossProfitPoint[];
  cogsByCategory: CogsByCategoryItem[];
  cogsByLocation: CogsByLocationItem[];
  marginByCategory: MarginByCategoryItem[];
}

export async function getFinancial(
  params: AnalyticsApiParams = {},
): Promise<FinancialData> {
  const q = buildQueryString(params);
  try {
    const response = await api.get<{ message: string; data: FinancialData }>(
      `/analytics/financial${q ? `?${q}` : ""}`,
    );
    return response.data.data;
  } catch (error) {
    handleApiError(error, "fetch financial analytics");
  }
}

// ============================================
// Export analytics (blob download)
// ============================================

export async function exportAnalytics(
  exportType: string,
  format: "csv" | "excel" = "excel",
  params: AnalyticsApiParams = {},
): Promise<import("axios").AxiosResponse<Blob>> {
  const q = buildQueryString(params);
  const typeParam = `type=${exportType}&format=${format}`;
  const qs = q ? `${typeParam}&${q}` : typeParam;
  try {
    const response = await api.get<Blob>(`/analytics/export?${qs}`, {
      responseType: "blob",
    });
    return response;
  } catch (error) {
    handleApiError(error, `export ${exportType} analytics`);
  }
}
