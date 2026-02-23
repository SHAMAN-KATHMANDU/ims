"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  type PaginatedLeadsResponse,
} from "@/services/leadService";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export type { LeadListParams, PaginatedLeadsResponse };

export const leadKeys = {
  all: ["leads"] as const,
  lists: () => [...leadKeys.all, "list"] as const,
  list: (params: LeadListParams) => [...leadKeys.lists(), params] as const,
  details: () => [...leadKeys.all, "detail"] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
};

export interface UseLeadsPaginatedOptions {
  initialData?: PaginatedLeadsResponse;
}

export function useLeadsPaginated(
  params: LeadListParams = {},
  options: UseLeadsPaginatedOptions = {},
) {
  const normalizedParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    search: params.search ?? "",
    sortBy: params.sortBy ?? "createdAt",
    sortOrder: params.sortOrder ?? "desc",
    status: params.status,
    source: params.source,
    assignedToId: params.assignedToId,
  };
  return useQuery({
    queryKey: leadKeys.list(normalizedParams),
    queryFn: () => getLeads(normalizedParams),
    placeholderData: (prev) => prev,
    initialData: options.initialData,
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: () => getLeadById(id),
    enabled: !!id,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLeadData) => createLead(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.lists() }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadData }) =>
      updateLead(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.lists() }),
  });
}

export function useConvertLead() {
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
    }) => convertLead(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string }) =>
      assignLead(id, assignedToId),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
    },
  });
}
