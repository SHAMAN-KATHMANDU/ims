"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsage,
  getResourceUsage,
  getAddOns,
  getAddOnPricing,
  requestAddOn,
  type ResourceUsage,
  type TenantAddOn,
  type AddOnPricing,
  type LimitedResource,
  type AddOnType,
  type AddOnStatus,
} from "@/services/usageService";

export type {
  ResourceUsage,
  TenantAddOn,
  AddOnPricing,
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
};

export function useUsage() {
  return useQuery({
    queryKey: usageKeys.summary(),
    queryFn: getUsage,
  });
}

export function useResourceUsage(resource: LimitedResource | null) {
  return useQuery({
    queryKey: usageKeys.resource(resource ?? ""),
    queryFn: () => getResourceUsage(resource!),
    enabled: !!resource,
  });
}

export function useAddOns() {
  return useQuery({
    queryKey: usageKeys.addOns(),
    queryFn: getAddOns,
  });
}

export function useAddOnPricing() {
  return useQuery({
    queryKey: usageKeys.pricing(),
    queryFn: getAddOnPricing,
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
