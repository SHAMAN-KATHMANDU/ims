/**
 * Promos feature types.
 */

import type { PaginationMeta } from "@/lib/apiTypes";

export type DiscountValueType = "PERCENTAGE" | "FLAT";
export type PromoEligibility = "ALL" | "MEMBER" | "NON_MEMBER" | "WHOLESALE";

export interface PromoCode {
  id: string;
  code: string;
  description?: string | null;
  valueType: DiscountValueType;
  value: number;
  overrideDiscounts: boolean;
  allowStacking: boolean;
  eligibility: PromoEligibility;
  validFrom?: string | null;
  validTo?: string | null;
  usageLimit?: number | null;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromoListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedPromosResponse {
  data: PromoCode[];
  pagination: PaginationMeta;
}

export interface CreateOrUpdatePromoData {
  code: string;
  description?: string;
  valueType: DiscountValueType;
  value: number;
  overrideDiscounts?: boolean;
  allowStacking?: boolean;
  eligibility?: PromoEligibility;
  validFrom?: string | null;
  validTo?: string | null;
  usageLimit?: number | null;
  isActive?: boolean;
  productIds?: string[];
}
