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
  type Deal,
  type DealListParams,
  type CreateDealData,
  type UpdateDealData,
} from "@/services/dealService";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

type DealsKanbanData = {
  pipeline: unknown;
  stages: Array<{ stage: string; deals: Deal[] }>;
  deals: Deal[];
};

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

export interface UseDealsKanbanOptions {
  initialData?: DealsKanbanData;
}

export function useDealsKanban(
  pipelineId?: string,
  options: UseDealsKanbanOptions = {},
) {
  return useQuery({
    queryKey: dealKeys.kanban(pipelineId),
    queryFn: () => getDealsKanban(pipelineId),
    initialData: !pipelineId ? options.initialData : undefined,
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
    mutationFn: ({
      id,
      stage,
      pipelineId: _pipelineId,
    }: {
      id: string;
      stage: string;
      pipelineId?: string;
    }) => updateDealStage(id, stage),
    onMutate: async ({ id, stage, pipelineId }) => {
      if (!pipelineId) return undefined;
      const queryKey = dealKeys.kanban(pipelineId);
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<DealsKanbanData>(queryKey);
      if (!prev?.stages) return { prev, queryKey };
      const deal = prev.stages.flatMap((c) => c.deals).find((d) => d.id === id);
      if (!deal || deal.stage === stage) return { prev, queryKey };
      const nextStages = prev.stages.map((col) => {
        if (col.stage === deal.stage)
          return { ...col, deals: col.deals.filter((d) => d.id !== id) };
        if (col.stage === stage)
          return { ...col, deals: [...col.deals, { ...deal, stage }] };
        return col;
      });
      qc.setQueryData(queryKey, {
        ...prev,
        stages: nextStages,
        deals: nextStages.flatMap((s) => s.deals),
      });
      return { prev, queryKey };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.queryKey, ctx.prev);
    },
    onSettled: (_data, _error, variables) => {
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: [...dealKeys.all, "kanban"] });
      if (variables?.id)
        qc.invalidateQueries({ queryKey: dealKeys.detail(variables.id) });
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDeal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: [...dealKeys.all, "kanban"] });
    },
  });
}
