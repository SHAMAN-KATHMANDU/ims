/**
 * Bundles feature types.
 */

import type { PaginationMeta } from "@/lib/apiTypes";

export type BundlePricingStrategy = "SUM" | "DISCOUNT_PCT" | "FIXED";

export interface Bundle {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  productIds: string[];
  pricingStrategy: BundlePricingStrategy;
  discountPct: number | null;
  fixedPrice: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BundleListParams {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedBundlesResponse {
  data: Bundle[];
  pagination: PaginationMeta;
}

export interface CreateBundleData {
  name: string;
  slug: string;
  description?: string | null;
  productIds: string[];
  pricingStrategy: BundlePricingStrategy;
  discountPct?: number | null;
  fixedPrice?: number | null;
  active?: boolean;
}

export type UpdateBundleData = Partial<CreateBundleData>;
