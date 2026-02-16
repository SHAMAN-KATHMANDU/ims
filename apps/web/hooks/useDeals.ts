"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDeals,
  getDealsKanban,
  getDealById,
  createDeal,
  updateDeal,
  updateDealStage,
  deleteDeal,
  type DealListParams,
  type CreateDealData,
  type UpdateDealData,
} from "@/services/dealService";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export const dealKeys = {
  all: ["deals"] as const,
  lists: () => [...dealKeys.all, "list"] as const,
  list: (params: DealListParams) => [...dealKeys.lists(), params] as const,
  kanban: (pipelineId?: string) =>
    [...dealKeys.all, "kanban", pipelineId] as const,
  details: () => [...dealKeys.all, "detail"] as const,
  detail: (id: string) => [...dealKeys.details(), id] as const,
};

export function useDealsPaginated(params: DealListParams = {}) {
  return useQuery({
    queryKey: dealKeys.list({
      page: params.page ?? DEFAULT_PAGE,
      limit: params.limit ?? DEFAULT_LIMIT,
      search: params.search ?? "",
      sortBy: params.sortBy ?? "createdAt",
      sortOrder: params.sortOrder ?? "desc",
      pipelineId: params.pipelineId,
      stage: params.stage,
      status: params.status,
      assignedToId: params.assignedToId,
    }),
    queryFn: () => getDeals(params),
    placeholderData: (prev) => prev,
  });
}

export function useDealsKanban(pipelineId?: string) {
  return useQuery({
    queryKey: dealKeys.kanban(pipelineId),
    queryFn: () => getDealsKanban(pipelineId),
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: dealKeys.detail(id),
    queryFn: () => getDealById(id),
    enabled: !!id,
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDealData) => createDeal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: dealKeys.kanban() });
    },
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDealData }) =>
      updateDeal(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: dealKeys.kanban() });
      qc.invalidateQueries({ queryKey: dealKeys.detail(id) });
    },
  });
}

export function useUpdateDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      updateDealStage(id, stage),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: dealKeys.kanban() });
      qc.invalidateQueries({ queryKey: dealKeys.detail(id) });
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDeal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: dealKeys.kanban() });
    },
  });
}
