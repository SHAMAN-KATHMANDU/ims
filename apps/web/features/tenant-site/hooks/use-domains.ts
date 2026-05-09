"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { useAuthStore, selectTenant } from "@/store/auth-store";
import {
  listMyDomains,
  createMyDomain,
  updateMyDomain,
  deleteMyDomain,
  verifyMyDomain,
  getMyDomainVerificationInstructions,
  type CreateDomainData,
  type UpdateDomainData,
} from "../domains/services/domains.service";

export type {
  TenantDomain,
  CreateDomainData,
  UpdateDomainData,
  DomainVerificationInstructions,
} from "../domains/services/domains.service";

export const domainKeys = {
  all: ["domains"] as const,
  list: (tenantId: string) => [...domainKeys.all, "list", tenantId] as const,
  detail: (id: string) => [...domainKeys.all, "detail", id] as const,
  verification: (id: string) =>
    [...domainKeys.all, "verification", id] as const,
};

export function useDomains() {
  const tenant = useAuthStore(selectTenant);
  const tenantId = tenant?.id ?? "";

  return useQuery({
    queryKey: domainKeys.list(tenantId),
    queryFn: listMyDomains,
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useDomain(id: string) {
  const tenant = useAuthStore(selectTenant);
  const tenantId = tenant?.id ?? "";

  return useQuery({
    queryKey: domainKeys.detail(id),
    queryFn: () =>
      listMyDomains().then((domains) => domains.find((d) => d.id === id)),
    enabled: !!tenantId && !!id,
  });
}

export function useCreateDomain() {
  const tenant = useAuthStore(selectTenant);
  const tenantId = tenant?.id ?? "";
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateDomainData) => createMyDomain(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: domainKeys.list(tenantId) });
      toast({ title: "Domain added" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add domain",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateDomain() {
  const tenant = useAuthStore(selectTenant);
  const tenantId = tenant?.id ?? "";
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDomainData }) =>
      updateMyDomain(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: domainKeys.list(tenantId) });
      qc.invalidateQueries({ queryKey: domainKeys.detail(id) });
      toast({ title: "Domain updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update domain",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteDomain() {
  const tenant = useAuthStore(selectTenant);
  const tenantId = tenant?.id ?? "";
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteMyDomain(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: domainKeys.list(tenantId) });
      toast({ title: "Domain deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete domain",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useVerifyDomain() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => verifyMyDomain(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: domainKeys.detail(id) });
      toast({ title: "Domain verified" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to verify domain",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDomainVerificationInstructions(domainId: string) {
  return useQuery({
    queryKey: domainKeys.verification(domainId),
    queryFn: () => getMyDomainVerificationInstructions(domainId),
    enabled: !!domainId,
  });
}
