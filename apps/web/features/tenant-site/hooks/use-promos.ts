"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import {
  promosService,
  type CreatePromoData,
  type UpdatePromoData,
  type PromoListParams,
} from "../services/promos.service";

export const promoKeys = {
  all: ["promos"] as const,
  list: (params?: PromoListParams) =>
    [...promoKeys.all, "list", params] as const,
  detail: (id: string) => [...promoKeys.all, "detail", id] as const,
  byCode: (code: string) => [...promoKeys.all, "byCode", code] as const,
  analytics: () => [...promoKeys.all, "analytics"] as const,
};

export function usePromosQuery(params?: PromoListParams) {
  return useQuery({
    queryKey: promoKeys.list(params),
    queryFn: () => promosService.listPromos(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePromoQuery(id: string | null) {
  return useQuery({
    queryKey: promoKeys.detail(id ?? ""),
    queryFn: () => promosService.getPromo(id!),
    enabled: !!id,
  });
}

export function usePromoByCodeQuery(code: string | null) {
  return useQuery({
    queryKey: promoKeys.byCode(code ?? ""),
    queryFn: () => promosService.getPromoByCode(code!),
    enabled: !!code,
  });
}

export function useCreatePromo() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreatePromoData) =>
      promosService.createPromo(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promoKeys.list() });
      qc.invalidateQueries({ queryKey: promoKeys.analytics() });
      toast({ title: "Promo code created" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create promo code",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdatePromo() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePromoData }) =>
      promosService.updatePromo(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: promoKeys.list() });
      qc.invalidateQueries({ queryKey: promoKeys.detail(id) });
      qc.invalidateQueries({ queryKey: promoKeys.analytics() });
      toast({ title: "Promo code updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update promo code",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeletePromo() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => promosService.deletePromo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promoKeys.list() });
      qc.invalidateQueries({ queryKey: promoKeys.analytics() });
      toast({ title: "Promo code deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete promo code",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function usePromoAnalytics() {
  return useQuery({
    queryKey: promoKeys.analytics(),
    queryFn: () => promosService.getPromoAnalytics(),
    staleTime: 5 * 60 * 1000,
  });
}
