"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@repo/shared";
import {
  getDeals,
  getDealsKanban,
  getDealById,
  createDeal,
  updateDeal,
  updateDealStage,
  deleteDeal,
  addDealLineItem,
  removeDealLineItem,
  convertDealToSale,
  type Deal,
  type PaginatedDealsResponse,
  type DealListParams,
  type CreateDealData,
  type UpdateDealData,
  type AddDealLineItemData,
} from "../services/deal.service";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";
import { contactKeys } from "./use-contacts";
import { crmKeys } from "./use-crm";

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

export function useDealsPaginated(
  params: DealListParams = {},
  options?: { enabled?: boolean },
) {
  const dealsEnabled = useEnvFeatureFlag(EnvFeature.CRM_DEALS);
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
      contactId: params.contactId,
    }),
    queryFn: () => getDeals(params),
    placeholderData: (prev: PaginatedDealsResponse | undefined) => prev,
    enabled: dealsEnabled && (options?.enabled ?? true),
  });
}

export function useDealsKanban(
  pipelineId?: string,
  options?: { enabled?: boolean },
) {
  const dealsEnabled = useEnvFeatureFlag(EnvFeature.CRM_DEALS);
  return useQuery({
    queryKey: dealKeys.kanban(pipelineId),
    queryFn: () => getDealsKanban(pipelineId),
    enabled: dealsEnabled && (options?.enabled ?? true),
  });
}

export function useDeal(id: string, options?: { enabled?: boolean }) {
  const dealsEnabled = useEnvFeatureFlag(EnvFeature.CRM_DEALS);
  return useQuery({
    queryKey: dealKeys.detail(id),
    queryFn: () => getDealById(id),
    enabled: dealsEnabled && !!id && (options?.enabled ?? true),
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDealData) => createDeal(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: dealKeys.kanban() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      if (variables.contactId) {
        qc.invalidateQueries({
          queryKey: contactKeys.detail(variables.contactId),
        });
      }
    },
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDealData }) =>
      updateDeal(id, data),
    onSuccess: (result, variables) => {
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: [...dealKeys.all, "kanban"] });
      qc.invalidateQueries({ queryKey: dealKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      if (result?.deal?.id && result.deal.id !== variables.id) {
        qc.invalidateQueries({ queryKey: dealKeys.detail(result.deal.id) });
      }
    },
  });
}

export function useUpdateDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      stage,
      targetPipelineId,
    }: {
      id: string;
      stage: string;
      /** Kanban board pipeline id (for optimistic updates on the active board). */
      boardPipelineId?: string;
      /** When set, API moves the deal to this pipeline (skip optimistic cross-board update). */
      targetPipelineId?: string;
    }) =>
      updateDealStage(id, {
        stage,
        ...(targetPipelineId ? { pipelineId: targetPipelineId } : {}),
      }),
    onMutate: async ({ id, stage, boardPipelineId, targetPipelineId }) => {
      if (targetPipelineId || !boardPipelineId) return undefined;
      const queryKey = dealKeys.kanban(boardPipelineId);
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
    onSettled: (data, _error, variables) => {
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: [...dealKeys.all, "kanban"] });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      if (variables?.id)
        qc.invalidateQueries({ queryKey: dealKeys.detail(variables.id) });
      if (data?.deal?.id && data.deal.id !== variables?.id)
        qc.invalidateQueries({ queryKey: dealKeys.detail(data.deal.id) });
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
      qc.invalidateQueries({ queryKey: crmKeys.all });
    },
  });
}

export function useAddDealLineItem(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddDealLineItemData) => addDealLineItem(dealId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dealKeys.detail(dealId) });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: [...dealKeys.all, "kanban"] });
      qc.invalidateQueries({ queryKey: crmKeys.all });
    },
  });
}

export function useRemoveDealLineItem(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lineItemId: string) => removeDealLineItem(dealId, lineItemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dealKeys.detail(dealId) });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: [...dealKeys.all, "kanban"] });
      qc.invalidateQueries({ queryKey: crmKeys.all });
    },
  });
}

export function useConvertDealToSale(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (locationId: string) => convertDealToSale(dealId, locationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dealKeys.detail(dealId) });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: [...dealKeys.all, "kanban"] });
      qc.invalidateQueries({ queryKey: crmKeys.all });
    },
  });
}
