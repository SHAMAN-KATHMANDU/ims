/**
 * Promo Service
 *
 * Single source for promo code API calls. All promo HTTP requests must go through this file.
 * Do not add React or UI logic.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import {
  type PaginationMeta,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/lib/apiTypes";

export type DiscountValueType = "PERCENTAGE" | "FLAT";
export type PromoEligibility = "ALL" | "MEMBER" | "NON_MEMBER" | "WHOLESALE";

export interface PromoCodeProduct {
  id: string;
  productId: string;
  promoCodeId: string;
  product: {
    id: string;
    name: string;
    imsCode: string;
  };
}

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
  products?: PromoCodeProduct[];
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
  applyToAll?: boolean;
  categoryIds?: string[];
  subCategories?: string[];
}

interface PromosApiResponse {
  message: string;
  data: PromoCode[];
  pagination: PaginationMeta;
}

interface PromoResponse {
  message: string;
  promo: PromoCode;
}

export { DEFAULT_PAGE, DEFAULT_LIMIT };

export async function getPromos(
  params: PromoListParams = {},
): Promise<PaginatedPromosResponse> {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    search,
    isActive,
    sortBy,
    sortOrder,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search?.trim()) {
    queryParams.set("search", search.trim());
  }
  if (typeof isActive === "boolean") {
    queryParams.set("isActive", String(isActive));
  }
  if (sortBy) {
    queryParams.set("sortBy", sortBy);
  }
  if (sortOrder) {
    queryParams.set("sortOrder", sortOrder);
  }

  try {
    const response = await api.get<PromosApiResponse>(
      `/promos?${queryParams.toString()}`,
    );
    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch promo codes");
  }
}

export async function getPromoById(id: string): Promise<PromoCode> {
  if (!id?.trim()) {
    throw new Error("Promo ID is required");
  }
  try {
    const response = await api.get<PromoResponse>(`/promos/${id}`);
    return response.data.promo;
  } catch (error) {
    handleApiError(error, `fetch promo "${id}"`);
  }
}

export async function createPromo(
  data: CreateOrUpdatePromoData,
): Promise<PromoCode> {
  if (!data.code?.trim()) {
    throw new Error("Promo code is required");
  }
  if (!data.valueType) {
    throw new Error("valueType is required");
  }
  if (data.value === undefined || data.value === null) {
    throw new Error("value is required");
  }

  try {
    const response = await api.post<PromoResponse>("/promos", data);
    return response.data.promo;
  } catch (error) {
    handleApiError(error, "create promo code");
  }
}

export async function updatePromo(
  id: string,
  data: Partial<CreateOrUpdatePromoData>,
): Promise<PromoCode> {
  if (!id?.trim()) {
    throw new Error("Promo ID is required");
  }

  try {
    const response = await api.put<PromoResponse>(`/promos/${id}`, data);
    return response.data.promo;
  } catch (error) {
    handleApiError(error, `update promo "${id}"`);
  }
}

/**
 * Search for a promo by code (for validation in sale flow).
 * Returns the matching promo or null if not found.
 */
export async function searchPromoByCode(
  code: string,
): Promise<PromoCode | null> {
  if (!code?.trim()) return null;
  const result = await getPromos({ search: code.trim(), limit: 1 });
  const found = result.data?.find(
    (p) => p.code.toLowerCase() === code.trim().toLowerCase(),
  );
  return found ?? null;
}

export async function deletePromo(id: string): Promise<void> {
  if (!id?.trim()) {
    throw new Error("Promo ID is required");
  }

  try {
    await api.delete(`/promos/${id}`);
  } catch (error) {
    handleApiError(error, `delete promo "${id}"`);
  }
}
