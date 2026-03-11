/**
 * Analytics feature types.
 */

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

export type AnalyticsSaleType = "GENERAL" | "MEMBER" | undefined;
export type AnalyticsCreditStatus = "all" | "outstanding" | "clear";

export interface AnalyticsFilters {
  dateFrom: string | undefined;
  dateTo: string | undefined;
  preset: string | undefined;
  locationIds: string[];
  saleType: AnalyticsSaleType;
  creditStatus: AnalyticsCreditStatus;
  userId: string | undefined;
  categoryId: string | undefined;
  vendorId: string | undefined;
}
