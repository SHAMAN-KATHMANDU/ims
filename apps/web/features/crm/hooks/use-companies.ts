"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFeatureFlag } from "@/features/flags";
import { Feature } from "@repo/shared";
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  listCompaniesForSelect,
  type CompanyListParams,
  type CreateCompanyData,
  type UpdateCompanyData,
} from "../services/company.service";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export const companyKeys = {
  all: ["companies"] as const,
  lists: () => [...companyKeys.all, "list"] as const,
  list: (params: CompanyListParams) =>
    [...companyKeys.lists(), params] as const,
  details: () => [...companyKeys.all, "detail"] as const,
  detail: (id: string) => [...companyKeys.details(), id] as const,
  select: () => [...companyKeys.all, "select"] as const,
};

export function useCompaniesPaginated(
  params: CompanyListParams = {},
  options?: { enabled?: boolean },
) {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  return useQuery({
    queryKey: companyKeys.list({
      page: params.page ?? DEFAULT_PAGE,
      limit: params.limit ?? DEFAULT_LIMIT,
      search: params.search ?? "",
      sortBy: params.sortBy ?? "name",
      sortOrder: params.sortOrder ?? "asc",
    }),
    queryFn: () => getCompanies(params),
    placeholderData: (prev) => prev,
    enabled: crmEnabled && (options?.enabled ?? true),
  });
}

export function useCompany(id: string, options?: { enabled?: boolean }) {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: () => getCompanyById(id),
    enabled: crmEnabled && !!id && (options?.enabled ?? true),
  });
}

export function useCompaniesForSelect(options?: { enabled?: boolean }) {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  return useQuery({
    queryKey: companyKeys.select(),
    queryFn: () => listCompaniesForSelect(),
    enabled: crmEnabled && (options?.enabled ?? true),
  });
}

export function useCreateCompany() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCompanyData) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return createCompany(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.lists() });
      qc.invalidateQueries({ queryKey: companyKeys.select() });
    },
  });
}

export function useUpdateCompany() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompanyData }) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return updateCompany(id, data);
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: companyKeys.lists() });
      qc.invalidateQueries({ queryKey: companyKeys.detail(id) });
      qc.invalidateQueries({ queryKey: companyKeys.select() });
    },
  });
}

export function useDeleteCompany() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return deleteCompany(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.lists() });
      qc.invalidateQueries({ queryKey: companyKeys.select() });
    },
  });
}
