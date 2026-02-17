"use client";

/**
 * React Query wrappers for promos. Business logic and API calls live in promoService; hooks only wire query/mutation and cache keys.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPromos,
  getPromoById,
  createPromo,
  updatePromo,
  deletePromo,
  type PromoCode,
  type PromoListParams,
  type PaginatedPromosResponse,
  type CreateOrUpdatePromoData,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/services/promoService";

export type {
  PromoCode,
  PromoListParams,
  PaginatedPromosResponse,
  CreateOrUpdatePromoData,
};

export { DEFAULT_PAGE, DEFAULT_LIMIT };

export const promoKeys = {
  all: ["promos"] as const,
  lists: () => [...promoKeys.all, "list"] as const,
  list: (params: PromoListParams) => [...promoKeys.lists(), params] as const,
  details: () => [...promoKeys.all, "detail"] as const,
  detail: (id: string) => [...promoKeys.details(), id] as const,
};

export function usePromosPaginated(params: PromoListParams = {}) {
  const normalizedParams: PromoListParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    search: params.search?.trim() || "",
    isActive: params.isActive,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };

  return useQuery({
    queryKey: promoKeys.list(normalizedParams),
    queryFn: () => getPromos(normalizedParams),
    placeholderData: (previousData) => previousData,
  });
}

export function usePromo(id: string) {
  return useQuery({
    queryKey: promoKeys.detail(id),
    queryFn: () => getPromoById(id),
    enabled: !!id,
  });
}

export function useCreatePromo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrUpdatePromoData) => createPromo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promoKeys.lists() });
    },
  });
}

export function useUpdatePromo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateOrUpdatePromoData }) =>
      updatePromo(id, data),
    onSuccess: (promo) => {
      queryClient.setQueryData(promoKeys.detail(promo.id), promo);
      queryClient.invalidateQueries({ queryKey: promoKeys.lists() });
    },
  });
}

export function useDeletePromo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePromo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promoKeys.lists() });
    },
  });
}
