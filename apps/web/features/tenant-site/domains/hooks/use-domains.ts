"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as domainsService from "../services/domains.service";

const domainKeys = {
  all: ["domains"] as const,
  list: () => [...domainKeys.all, "list"] as const,
  detail: (id: string) => [...domainKeys.all, "detail", id] as const,
  instructions: (id: string) =>
    [...domainKeys.all, "instructions", id] as const,
};

export function useMyDomains() {
  return useQuery({
    queryKey: domainKeys.list(),
    queryFn: () => domainsService.listMyDomains(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyDomain(domainId: string) {
  return useQuery({
    queryKey: domainKeys.detail(domainId),
    queryFn: () => domainsService.getMyDomain(domainId),
    enabled: !!domainId,
  });
}

export function useMyDomainVerificationInstructions(domainId: string) {
  return useQuery({
    queryKey: domainKeys.instructions(domainId),
    queryFn: () => domainsService.getMyDomainVerificationInstructions(domainId),
    enabled: !!domainId,
  });
}

export function useAddMyDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: domainsService.createMyDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: domainKeys.list() });
    },
  });
}

export function useUpdateMyDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      domainId,
      data,
    }: {
      domainId: string;
      data: domainsService.UpdateDomainData;
    }) => domainsService.updateMyDomain(domainId, data),
    onSuccess: (domain) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.list() });
      queryClient.setQueryData(domainKeys.detail(domain.id), domain);
    },
  });
}

export function useDeleteMyDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: domainsService.deleteMyDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: domainKeys.list() });
    },
  });
}

export function useVerifyMyDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: domainsService.verifyMyDomain,
    onSuccess: (domain) => {
      queryClient.setQueryData(domainKeys.detail(domain.id), domain);
      queryClient.invalidateQueries({ queryKey: domainKeys.list() });
    },
  });
}
