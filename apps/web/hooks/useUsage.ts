"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsage,
  getResourceUsage,
  getAddOns,
  getAddOnPricing,
  getPlansWithPricing,
  requestAddOn,
  type ResourceUsage,
  type TenantAddOn,
  type AddOnPricing,
  type PlanWithPricing,
  type LimitedResource,
  type AddOnType,
  type AddOnStatus,
} from "@/services/usageService";

export type {
  ResourceUsage,
  TenantAddOn,
  AddOnPricing,
  PlanWithPricing,
  LimitedResource,
  AddOnType,
  AddOnStatus,
};

const usageKeys = {
  all: ["usage"] as const,
  summary: () => [...usageKeys.all, "summary"] as const,
  resource: (r: string) => [...usageKeys.all, "resource", r] as const,
  addOns: () => [...usageKeys.all, "add-ons"] as const,
  pricing: () => [...usageKeys.all, "pricing"] as const,
  plans: () => [...usageKeys.all, "plans"] as const,
};

const USAGE_STALE_MS = 60 * 1000; // 1 min – usage/plans can be slightly stale

export function useUsage() {
  return useQuery({
    queryKey: usageKeys.summary(),
    queryFn: getUsage,
    staleTime: USAGE_STALE_MS,
  });
}

export function useResourceUsage(resource: LimitedResource | null) {
  return useQuery({
    queryKey: usageKeys.resource(resource ?? ""),
    queryFn: () => getResourceUsage(resource!),
    enabled: !!resource,
    staleTime: USAGE_STALE_MS,
  });
}

export function useAddOns() {
  return useQuery({
    queryKey: usageKeys.addOns(),
    queryFn: getAddOns,
    staleTime: USAGE_STALE_MS,
  });
}

export function useAddOnPricing() {
  return useQuery({
    queryKey: usageKeys.pricing(),
    queryFn: getAddOnPricing,
    staleTime: USAGE_STALE_MS,
  });
}

export function useTenantPlans() {
  return useQuery({
    queryKey: usageKeys.plans(),
    queryFn: getPlansWithPricing,
    staleTime: USAGE_STALE_MS,
  });
}

export function useRequestAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestAddOn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usageKeys.addOns() });
      queryClient.invalidateQueries({ queryKey: usageKeys.summary() });
    },
  });
}

export { usageKeys };
