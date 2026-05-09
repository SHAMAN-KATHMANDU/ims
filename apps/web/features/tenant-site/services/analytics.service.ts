import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export interface AnalyticsParams {
  dateFrom?: string;
  dateTo?: string;
  locationIds?: string;
  saleType?: "GENERAL" | "MEMBER";
  creditStatus?: "credit" | "non-credit";
  userId?: string;
  categoryId?: string;
  vendorId?: string;
}

export interface OverviewMetrics {
  totalRevenue: number;
  totalSales: number;
  averageOrderValue: number;
  conversionRate: number;
  newCustomers: number;
  returningCustomers: number;
  [key: string]: unknown;
}

export interface SalesRevenueMetrics {
  totalRevenue: number;
  totalSales: number;
  averageOrderValue: number;
  trend: Array<{
    date: string;
    revenue: number;
    sales: number;
  }>;
  [key: string]: unknown;
}

export interface InventoryOpsMetrics {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  turnoverRate: number;
  daysOnHand: number;
  [key: string]: unknown;
}

export interface CustomersPromosMetrics {
  totalCustomers: number;
  newCustomers: number;
  repeatingCustomers: number;
  promosUsed: number;
  averagePromoValue: number;
  [key: string]: unknown;
}

export interface TrendsMetrics {
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    sales: number;
  }>;
  seasonality: Array<{
    period: string;
    revenue: number;
  }>;
  peakHours: Array<{
    hour: number;
    sales: number;
  }>;
  [key: string]: unknown;
}

export interface FinancialMetrics {
  grossProfit: number;
  cogs: number;
  margin: number;
  costOfSales: number;
  operatingExpense: number;
  netProfit: number;
  [key: string]: unknown;
}

export interface DiscountMetrics {
  totalDiscounts: number;
  discountPercentage: number;
  topDiscounts: Array<{
    name: string;
    count: number;
    totalValue: number;
  }>;
  [key: string]: unknown;
}

export interface PaymentTrendsMetrics {
  paymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
  trend: Array<{
    date: string;
    data: Record<string, number>;
  }>;
  [key: string]: unknown;
}

export interface LocationComparisonMetrics {
  locations: Array<{
    locationId: string;
    name: string;
    revenue: number;
    sales: number;
    customers: number;
  }>;
  [key: string]: unknown;
}

export interface MemberCohortMetrics {
  newMembers: number;
  repeatMembers: number;
  memberRevenue: number;
  memberRetention: number;
  [key: string]: unknown;
}

export interface SalesExtendedMetrics {
  growth: number;
  basketSize: number;
  peakHours: Array<{
    hour: number;
    sales: number;
  }>;
  [key: string]: unknown;
}

export interface ProductInsightsMetrics {
  topProducts: Array<{
    productId: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  abcAnalysis: Record<string, unknown>;
  coPurchase: Array<{
    product1: string;
    product2: string;
    frequency: number;
  }>;
  [key: string]: unknown;
}

export interface InventoryExtendedMetrics {
  turnover: number;
  daysOnHand: number;
  deadStock: Array<{
    productId: string;
    name: string;
    lastSold: string;
  }>;
  [key: string]: unknown;
}

export interface CustomerInsightsMetrics {
  customerLifetimeValue: number;
  retention: number;
  rfm: Record<string, unknown>;
  [key: string]: unknown;
}

export const analyticsService = {
  async getOverview(params?: AnalyticsParams): Promise<OverviewMetrics> {
    try {
      const { data } = await api.get<{ overview: OverviewMetrics }>(
        "/analytics/overview",
        { params },
      );
      return data.overview;
    } catch (error) {
      throw handleApiError(error, "analytics overview");
    }
  },

  async getSalesRevenue(
    params?: AnalyticsParams,
  ): Promise<SalesRevenueMetrics> {
    try {
      const { data } = await api.get<{ salesRevenue: SalesRevenueMetrics }>(
        "/analytics/sales-revenue",
        { params },
      );
      return data.salesRevenue;
    } catch (error) {
      throw handleApiError(error, "analytics sales revenue");
    }
  },

  async getInventoryOps(
    params?: AnalyticsParams,
  ): Promise<InventoryOpsMetrics> {
    try {
      const { data } = await api.get<{ inventoryOps: InventoryOpsMetrics }>(
        "/analytics/inventory-ops",
        { params },
      );
      return data.inventoryOps;
    } catch (error) {
      throw handleApiError(error, "analytics inventory ops");
    }
  },

  async getCustomersPromos(
    params?: AnalyticsParams,
  ): Promise<CustomersPromosMetrics> {
    try {
      const { data } = await api.get<{
        customersPromos: CustomersPromosMetrics;
      }>("/analytics/customers-promos", { params });
      return data.customersPromos;
    } catch (error) {
      throw handleApiError(error, "analytics customers promos");
    }
  },

  async getDiscountAnalytics(
    params?: AnalyticsParams,
  ): Promise<DiscountMetrics> {
    try {
      const { data } = await api.get<{ discount: DiscountMetrics }>(
        "/analytics/discount",
        { params },
      );
      return data.discount;
    } catch (error) {
      throw handleApiError(error, "analytics discount");
    }
  },

  async getPaymentTrends(
    params?: AnalyticsParams,
  ): Promise<PaymentTrendsMetrics> {
    try {
      const { data } = await api.get<{ paymentTrends: PaymentTrendsMetrics }>(
        "/analytics/payment-trends",
        { params },
      );
      return data.paymentTrends;
    } catch (error) {
      throw handleApiError(error, "analytics payment trends");
    }
  },

  async getLocationComparison(
    params?: AnalyticsParams,
  ): Promise<LocationComparisonMetrics> {
    try {
      const { data } = await api.get<{
        locationComparison: LocationComparisonMetrics;
      }>("/analytics/location-comparison", { params });
      return data.locationComparison;
    } catch (error) {
      throw handleApiError(error, "analytics location comparison");
    }
  },

  async getMemberCohort(
    params?: AnalyticsParams,
  ): Promise<MemberCohortMetrics> {
    try {
      const { data } = await api.get<{ memberCohort: MemberCohortMetrics }>(
        "/analytics/member-cohort",
        { params },
      );
      return data.memberCohort;
    } catch (error) {
      throw handleApiError(error, "analytics member cohort");
    }
  },

  async getSalesExtended(
    params?: AnalyticsParams,
  ): Promise<SalesExtendedMetrics> {
    try {
      const { data } = await api.get<{ salesExtended: SalesExtendedMetrics }>(
        "/analytics/sales-extended",
        { params },
      );
      return data.salesExtended;
    } catch (error) {
      throw handleApiError(error, "analytics sales extended");
    }
  },

  async getProductInsights(
    params?: AnalyticsParams,
  ): Promise<ProductInsightsMetrics> {
    try {
      const { data } = await api.get<{
        productInsights: ProductInsightsMetrics;
      }>("/analytics/product-insights", { params });
      return data.productInsights;
    } catch (error) {
      throw handleApiError(error, "analytics product insights");
    }
  },

  async getInventoryExtended(
    params?: AnalyticsParams,
  ): Promise<InventoryExtendedMetrics> {
    try {
      const { data } = await api.get<{
        inventoryExtended: InventoryExtendedMetrics;
      }>("/analytics/inventory-extended", { params });
      return data.inventoryExtended;
    } catch (error) {
      throw handleApiError(error, "analytics inventory extended");
    }
  },

  async getCustomerInsights(
    params?: AnalyticsParams,
  ): Promise<CustomerInsightsMetrics> {
    try {
      const { data } = await api.get<{
        customerInsights: CustomerInsightsMetrics;
      }>("/analytics/customer-insights", { params });
      return data.customerInsights;
    } catch (error) {
      throw handleApiError(error, "analytics customer insights");
    }
  },

  async getTrends(params?: AnalyticsParams): Promise<TrendsMetrics> {
    try {
      const { data } = await api.get<{ trends: TrendsMetrics }>(
        "/analytics/trends",
        { params },
      );
      return data.trends;
    } catch (error) {
      throw handleApiError(error, "analytics trends");
    }
  },

  async getFinancial(params?: AnalyticsParams): Promise<FinancialMetrics> {
    try {
      const { data } = await api.get<{ financial: FinancialMetrics }>(
        "/analytics/financial",
        { params },
      );
      return data.financial;
    } catch (error) {
      throw handleApiError(error, "analytics financial");
    }
  },
};
