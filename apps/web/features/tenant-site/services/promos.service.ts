import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export interface PromoCode {
  id: string;
  tenantId: string;
  code: string;
  description?: string | null;
  valueType: "PERCENTAGE" | "FLAT";
  value: number;
  overrideDiscounts: boolean;
  allowStacking: boolean;
  eligibility: "ALL" | "MEMBER" | "NON_MEMBER" | "WHOLESALE";
  validFrom?: string | null;
  validTo?: string | null;
  usageLimit?: number | null;
  usageCount: number;
  isActive: boolean;
  productIds?: string[];
  applyToAll?: boolean;
  categoryIds?: string[];
  subCategories?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromoData {
  code: string;
  description?: string;
  valueType: "PERCENTAGE" | "FLAT";
  value: number;
  overrideDiscounts?: boolean;
  allowStacking?: boolean;
  eligibility?: "ALL" | "MEMBER" | "NON_MEMBER" | "WHOLESALE";
  validFrom?: string | Date;
  validTo?: string | Date;
  usageLimit?: number | null;
  isActive?: boolean;
  productIds?: string[];
  applyToAll?: boolean;
  categoryIds?: string[];
  subCategories?: string[];
}

export interface UpdatePromoData {
  code?: string;
  description?: string | null;
  valueType?: "PERCENTAGE" | "FLAT";
  value?: number;
  overrideDiscounts?: boolean;
  allowStacking?: boolean;
  eligibility?: "ALL" | "MEMBER" | "NON_MEMBER" | "WHOLESALE";
  validFrom?: string | Date | null;
  validTo?: string | Date | null;
  usageLimit?: number | null;
  isActive?: boolean;
  productIds?: string[];
  applyToAll?: boolean;
  categoryIds?: string[];
  subCategories?: string[];
}

export interface PromoListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
}

export interface PromoListResponse {
  promos: PromoCode[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface PromoAnalytics {
  totalRedeemed: number;
  totalDiscount: number;
  averageDiscountPerUse: number;
  activePromos: number;
}

export const promosService = {
  async listPromos(params?: PromoListParams): Promise<PromoListResponse> {
    try {
      const { data } = await api.get<{
        promos: PromoCode[];
        pagination: PromoListResponse["pagination"];
      }>("/promos", { params });
      return {
        promos: data.promos ?? [],
        pagination: data.pagination,
      };
    } catch (error) {
      throw handleApiError(error, "promos list");
    }
  },

  async getPromo(id: string): Promise<PromoCode> {
    try {
      const { data } = await api.get<{ promo: PromoCode }>(`/promos/${id}`);
      return data.promo;
    } catch (error) {
      throw handleApiError(error, "promos get");
    }
  },

  async getPromoByCode(code: string): Promise<PromoCode> {
    try {
      const { data } = await api.get<{ promo: PromoCode }>(
        `/promos/by-code/${code}`,
      );
      return data.promo;
    } catch (error) {
      throw handleApiError(error, "promos get by code");
    }
  },

  async createPromo(payload: CreatePromoData): Promise<PromoCode> {
    try {
      const { data } = await api.post<{ promo: PromoCode }>("/promos", payload);
      return data.promo;
    } catch (error) {
      throw handleApiError(error, "promos create");
    }
  },

  async updatePromo(id: string, payload: UpdatePromoData): Promise<PromoCode> {
    try {
      const { data } = await api.put<{ promo: PromoCode }>(
        `/promos/${id}`,
        payload,
      );
      return data.promo;
    } catch (error) {
      throw handleApiError(error, "promos update");
    }
  },

  async deletePromo(id: string): Promise<void> {
    try {
      await api.delete(`/promos/${id}`);
    } catch (error) {
      throw handleApiError(error, "promos delete");
    }
  },

  async getPromoAnalytics(): Promise<PromoAnalytics> {
    try {
      const { data } = await api.get<{ analytics: PromoAnalytics }>(
        "/promos/analytics",
      );
      return data.analytics;
    } catch (error) {
      throw handleApiError(error, "promos analytics");
    }
  },
};
