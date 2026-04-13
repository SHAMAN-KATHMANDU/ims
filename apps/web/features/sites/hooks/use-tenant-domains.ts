"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTenantDomains,
  createTenantDomain,
  updateTenantDomain,
  deleteTenantDomain,
  getDomainVerificationInstructions,
  verifyTenantDomain,
  type TenantDomain,
  type TenantDomainApp,
  type CreateTenantDomainData,
  type UpdateTenantDomainData,
  type DomainVerificationInstructions,
} from "../services/site-platform.service";

export type {
  TenantDomain,
  TenantDomainApp,
  CreateTenantDomainData,
  UpdateTenantDomainData,
  DomainVerificationInstructions,
};

export const tenantDomainKeys = {
  all: ["platform", "tenant-domains"] as const,
  list: (tenantId: string, appType?: TenantDomainApp) =>
    [...tenantDomainKeys.all, "list", tenantId, appType] as const,
  verification: (domainId: string) =>
    [...tenantDomainKeys.all, "verification", domainId] as const,
};

export function useTenantDomains(
  tenantId: string | null,
  appType?: TenantDomainApp,
) {
  return useQuery({
    queryKey: tenantDomainKeys.list(tenantId ?? "", appType),
    queryFn: () => getTenantDomains(tenantId!, appType),
    enabled: !!tenantId?.trim(),
  });
}

export function useCreateTenantDomain(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTenantDomainData) =>
      createTenantDomain(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantDomainKeys.all });
    },
  });
}

export function useUpdateTenantDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      domainId,
      data,
    }: {
      domainId: string;
      data: UpdateTenantDomainData;
    }) => updateTenantDomain(domainId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantDomainKeys.all });
    },
  });
}

export function useDeleteTenantDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (domainId: string) => deleteTenantDomain(domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantDomainKeys.all });
    },
  });
}

export function useDomainVerificationInstructions(domainId: string | null) {
  return useQuery({
    queryKey: tenantDomainKeys.verification(domainId ?? ""),
    queryFn: () => getDomainVerificationInstructions(domainId!),
    enabled: !!domainId?.trim(),
  });
}

export function useVerifyTenantDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (domainId: string) => verifyTenantDomain(domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantDomainKeys.all });
    },
  });
}
