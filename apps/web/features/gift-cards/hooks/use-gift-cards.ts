"use client";

/**
 * React Query wrappers for gift cards. Business logic and API calls live in
 * giftCard.service; hooks only wire query/mutation and cache keys.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGiftCards,
  getGiftCardById,
  createGiftCard,
  updateGiftCard,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "../services/giftCard.service";
import type {
  CreateGiftCardData,
  GiftCard,
  GiftCardListParams,
  PaginatedGiftCardsResponse,
  UpdateGiftCardData,
} from "../types";

export type {
  CreateGiftCardData,
  GiftCard,
  GiftCardListParams,
  PaginatedGiftCardsResponse,
  UpdateGiftCardData,
};

export { DEFAULT_PAGE, DEFAULT_LIMIT };

export const giftCardKeys = {
  all: ["gift-cards"] as const,
  lists: () => [...giftCardKeys.all, "list"] as const,
  list: (params: GiftCardListParams) =>
    [...giftCardKeys.lists(), params] as const,
  details: () => [...giftCardKeys.all, "detail"] as const,
  detail: (id: string) => [...giftCardKeys.details(), id] as const,
};

export function useGiftCardsPaginated(params: GiftCardListParams = {}) {
  const normalizedParams: GiftCardListParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    search: params.search?.trim() || "",
    status: params.status,
  };

  return useQuery({
    queryKey: giftCardKeys.list(normalizedParams),
    queryFn: () => getGiftCards(normalizedParams),
    placeholderData: (previousData) => previousData,
  });
}

export function useGiftCard(id: string) {
  return useQuery({
    queryKey: giftCardKeys.detail(id),
    queryFn: () => getGiftCardById(id),
    enabled: !!id,
  });
}

export function useCreateGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGiftCardData) => createGiftCard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCardKeys.lists() });
    },
  });
}

export function useUpdateGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGiftCardData }) =>
      updateGiftCard(id, data),
    onSuccess: (giftCard: GiftCard) => {
      queryClient.setQueryData(giftCardKeys.detail(giftCard.id), giftCard);
      queryClient.invalidateQueries({ queryKey: giftCardKeys.lists() });
    },
  });
}

export function useVoidGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => updateGiftCard(id, { status: "VOIDED" }),
    onSuccess: (giftCard: GiftCard) => {
      queryClient.setQueryData(giftCardKeys.detail(giftCard.id), giftCard);
      queryClient.invalidateQueries({ queryKey: giftCardKeys.lists() });
    },
  });
}
