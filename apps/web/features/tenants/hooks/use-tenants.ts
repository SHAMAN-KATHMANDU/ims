"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  changeTenantPlan,
  activateTenant,
  deactivateTenant,
  createTenantUser,
  resetTenantUserPassword,
  getPlatformResetRequests,
  approvePlatformResetRequest,
  type Tenant,
  type CreateTenantData,
  type UpdateTenantData,
  type CreateTenantUserData,
  type PlanTier,
  type SubscriptionStatus,
  type PlatformPasswordResetRequest,
  type GetTenantsParams,
  type GetPlatformResetRequestsParams,
} from "../services/tenant.service";

export type {
  Tenant,
  CreateTenantData,
  UpdateTenantData,
  CreateTenantUserData,
  PlanTier,
  SubscriptionStatus,
  PlatformPasswordResetRequest,
};

export const tenantKeys = {
  all: ["platform", "tenants"] as const,
  lists: (params?: GetTenantsParams) =>
    [...tenantKeys.all, "list", params] as const,
  details: () => [...tenantKeys.all, "detail"] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const,
};

export function useTenants(params?: GetTenantsParams) {
  return useQuery({
    queryKey: tenantKeys.lists(params),
    queryFn: () => getTenants(params),
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
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantData }) =>
      updateTenant(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
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
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(id) });
    },
  });
}

export function useActivateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activateTenant,
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(tenant.id) });
    },
  });
}

export function useDeactivateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivateTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
}

export function useCreateTenantUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantId,
      data,
    }: {
      tenantId: string;
      data: CreateTenantUserData;
    }) => createTenantUser(tenantId, data),
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(tenantId) });
    },
  });
}

export function useResetTenantUserPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantId,
      userId,
      newPassword,
    }: {
      tenantId: string;
      userId: string;
      newPassword: string;
    }) => resetTenantUserPassword(tenantId, userId, newPassword),
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(tenantId) });
    },
  });
}

export const platformResetKeys = {
  all: ["platform", "password-reset-requests"] as const,
  list: (params?: GetPlatformResetRequestsParams) =>
    [...platformResetKeys.all, params] as const,
};

export function usePlatformResetRequests(
  params?: GetPlatformResetRequestsParams,
) {
  return useQuery({
    queryKey: platformResetKeys.list(params),
    queryFn: () => getPlatformResetRequests(params),
  });
}

export function useApprovePlatformResetRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      requestId,
      newPassword,
    }: {
      requestId: string;
      newPassword: string;
    }) => approvePlatformResetRequest(requestId, newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformResetKeys.all });
      toast({ title: "Password reset approved" });
    },
    onError: (err: Error) => {
      toast({
        title: err.message ?? "Failed to approve",
        variant: "destructive",
      });
    },
  });
}
