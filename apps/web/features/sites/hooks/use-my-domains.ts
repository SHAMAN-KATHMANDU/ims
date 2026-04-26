"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyDomains,
  createMyDomain,
  deleteMyDomain,
  getMyDomainVerificationInstructions,
  verifyMyDomain,
  type TenantDomain,
  type TenantDomainApp,
  type CreateTenantDomainData,
  type DomainVerificationInstructions,
} from "../services/site-platform.service";

export type {
  TenantDomain,
  TenantDomainApp,
  CreateTenantDomainData,
  DomainVerificationInstructions,
};

export const myDomainKeys = {
  all: ["my-domains"] as const,
  list: (appType?: TenantDomainApp) =>
    [...myDomainKeys.all, "list", appType] as const,
  verification: (domainId: string) =>
    [...myDomainKeys.all, "verification", domainId] as const,
};

/** List all domains for the calling tenant (no tenantId needed — JWT carries it). */
export function useMyDomains(appType?: TenantDomainApp) {
  return useQuery({
    queryKey: myDomainKeys.list(appType),
    queryFn: () => getMyDomains(appType),
  });
}

/** Add a domain to the calling tenant. */
export function useAddMyDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTenantDomainData) => createMyDomain(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myDomainKeys.all });
    },
  });
}

/** Delete a domain belonging to the calling tenant. */
export function useDeleteMyDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (domainId: string) => deleteMyDomain(domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myDomainKeys.all });
    },
  });
}

/** Fetch DNS verification instructions for a domain belonging to the calling tenant. */
export function useMyDomainVerificationInstructions(domainId: string | null) {
  return useQuery({
    queryKey: myDomainKeys.verification(domainId ?? ""),
    queryFn: () => getMyDomainVerificationInstructions(domainId!),
    enabled: !!domainId?.trim(),
  });
}

/** Run DNS TXT verification for a domain belonging to the calling tenant. */
export function useVerifyMyDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (domainId: string) => verifyMyDomain(domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myDomainKeys.all });
    },
  });
}
