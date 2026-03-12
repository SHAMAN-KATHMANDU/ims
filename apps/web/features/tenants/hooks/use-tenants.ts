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
};

export function usePlatformResetRequests() {
  return useQuery({
    queryKey: platformResetKeys.all,
    queryFn: getPlatformResetRequests,
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
      toast({ title: err.message ?? "Failed to approve", variant: "destructive" });
    },
  });
}
