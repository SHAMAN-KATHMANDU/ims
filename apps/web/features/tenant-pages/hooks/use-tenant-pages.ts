"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listTenantPages,
  getTenantPage,
  createTenantPage,
  updateTenantPage,
  publishTenantPage,
  unpublishTenantPage,
  deleteTenantPage,
  reorderTenantPages,
  type ListTenantPagesQuery,
  type CreateTenantPageData,
  type UpdateTenantPageData,
  type ReorderPagesInput,
} from "../services/tenant-pages.service";

export const tenantPagesKeys = {
  all: ["tenant-pages"] as const,
  list: (query?: ListTenantPagesQuery) =>
    [...tenantPagesKeys.all, "list", query ?? {}] as const,
  page: (id: string) => [...tenantPagesKeys.all, "page", id] as const,
};

export function useTenantPages(query: ListTenantPagesQuery = {}) {
  return useQuery({
    queryKey: tenantPagesKeys.list(query),
    queryFn: () => listTenantPages(query),
    retry: false,
  });
}

export function useTenantPage(id: string | null) {
  return useQuery({
    queryKey: tenantPagesKeys.page(id ?? ""),
    queryFn: () => {
      if (!id) throw new Error("Page id is required");
      return getTenantPage(id);
    },
    enabled: !!id,
    retry: false,
  });
}

export function useCreateTenantPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTenantPageData) => createTenantPage(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantPagesKeys.all });
    },
  });
}

export function useUpdateTenantPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantPageData }) =>
      updateTenantPage(id, data),
    onSuccess: (page) => {
      qc.invalidateQueries({ queryKey: tenantPagesKeys.all });
      qc.setQueryData(tenantPagesKeys.page(page.id), page);
    },
  });
}

export function usePublishTenantPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishTenantPage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantPagesKeys.all });
    },
  });
}

export function useUnpublishTenantPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unpublishTenantPage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantPagesKeys.all });
    },
  });
}

export function useDeleteTenantPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTenantPage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantPagesKeys.all });
    },
  });
}

export function useReorderTenantPages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReorderPagesInput) => reorderTenantPages(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantPagesKeys.all });
    },
  });
}
