"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFeatureFlag } from "@/features/flags";
import { Feature } from "@repo/shared";
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  convertLead,
  assignLead,
  type LeadListParams,
  type CreateLeadData,
  type UpdateLeadData,
} from "../services/lead.service";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";
import { crmKeys } from "./use-crm";
import { contactKeys } from "./use-contacts";
import { dealKeys } from "./use-deals";

export const leadKeys = {
  all: ["leads"] as const,
  lists: () => [...leadKeys.all, "list"] as const,
  list: (params: LeadListParams) => [...leadKeys.lists(), params] as const,
  details: () => [...leadKeys.all, "detail"] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
};

export function useLeadsPaginated(
  params: LeadListParams = {},
  options?: { enabled?: boolean },
) {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  return useQuery({
    queryKey: leadKeys.list({
      page: params.page ?? DEFAULT_PAGE,
      limit: params.limit ?? DEFAULT_LIMIT,
      search: params.search ?? "",
      sortBy: params.sortBy ?? "createdAt",
      sortOrder: params.sortOrder ?? "desc",
      status: params.status,
      source: params.source,
      assignedToId: params.assignedToId,
    }),
    queryFn: () => getLeads(params),
    placeholderData: (prev) => prev,
    enabled: crmEnabled && (options?.enabled ?? true),
  });
}

export function useLead(id: string, options?: { enabled?: boolean }) {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: () => getLeadById(id),
    enabled: crmEnabled && !!id && (options?.enabled ?? true),
  });
}

export function useCreateLead() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLeadData) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return createLead(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
    },
  });
}

export function useUpdateLead() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadData }) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return updateLead(id, data);
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
      qc.invalidateQueries({ queryKey: crmKeys.all });
    },
  });
}

export function useDeleteLead() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return deleteLead(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
    },
  });
}

export function useConvertLead() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data?: {
        contactId?: string;
        dealName?: string;
        dealValue?: number;
        pipelineId?: string;
      };
    }) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return convertLead(id, data);
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
      qc.invalidateQueries({ queryKey: contactKeys.all });
      qc.invalidateQueries({ queryKey: dealKeys.all });
      qc.invalidateQueries({ queryKey: crmKeys.all });
    },
  });
}

export function useAssignLead() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      assignedToId,
    }: {
      id: string;
      assignedToId: string;
    }) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return assignLead(id, assignedToId);
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
      qc.invalidateQueries({ queryKey: crmKeys.all });
    },
  });
}
