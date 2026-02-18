"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  changeTenantPlan,
  activateTenant,
  deactivateTenant,
  type Tenant,
  type CreateTenantData,
  type UpdateTenantData,
  type PlanTier,
  type SubscriptionStatus,
} from "@/services/tenantService";

export type {
  Tenant,
  CreateTenantData,
  UpdateTenantData,
  PlanTier,
  SubscriptionStatus,
};

const tenantKeys = {
  all: ["platform", "tenants"] as const,
  lists: () => [...tenantKeys.all, "list"] as const,
  list: () => [...tenantKeys.lists()] as const,
  details: () => [...tenantKeys.all, "detail"] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const,
};

export function useTenants() {
  return useQuery({
    queryKey: tenantKeys.list(),
    queryFn: getTenants,
  });
}

export function useTenant(id: string | null) {
  return useQuery({
    queryKey: tenantKeys.detail(id ?? ""),
    queryFn: () => getTenantById(id!),
    enabled: !!id?.trim(),
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantData }) =>
      updateTenant(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(id) });
    },
  });
}

export function useChangeTenantPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      plan,
      expiresAt,
    }: {
      id: string;
      plan: PlanTier;
      expiresAt?: string | null;
    }) => changeTenantPlan(id, plan, expiresAt),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(id) });
    },
  });
}

export function useActivateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activateTenant,
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(tenant.id) });
    },
  });
}

export function useDeactivateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivateTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}
