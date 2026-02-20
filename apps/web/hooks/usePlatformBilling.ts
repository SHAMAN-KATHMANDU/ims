"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAddOnPricingList,
  createAddOnPricing,
  updateAddOnPricing,
  deleteAddOnPricing,
  getTenantAddOns,
  createTenantAddOn,
  updateTenantAddOn,
  approveTenantAddOn,
  cancelTenantAddOn,
  deleteTenantAddOn,
  getSubscriptions,
  updateSubscription,
  getPayments,
  updatePayment,
  getPricingPlans,
  updatePricingPlan,
  getPlanLimits,
  type PlatformTenantAddOn,
  type Subscription,
  type TenantPayment,
  type PricingPlan,
  type PlanLimit,
} from "@/services/platformBillingService";
import type { AddOnStatus } from "@/services/usageService";

export type {
  PlatformTenantAddOn,
  Subscription,
  TenantPayment,
  PricingPlan,
  PlanLimit,
};

const billingKeys = {
  all: ["platform", "billing"] as const,
  addOnPricing: () => [...billingKeys.all, "add-on-pricing"] as const,
  tenantAddOns: (params?: Record<string, string>) =>
    [...billingKeys.all, "tenant-add-ons", params ?? {}] as const,
  subscriptions: (tenantId?: string) =>
    [...billingKeys.all, "subscriptions", tenantId ?? "all"] as const,
  payments: (params?: Record<string, string>) =>
    [...billingKeys.all, "payments", params ?? {}] as const,
  pricingPlans: () => [...billingKeys.all, "pricing-plans"] as const,
  planLimits: () => [...billingKeys.all, "plan-limits"] as const,
};

// Add-On Pricing
export function useAddOnPricingList() {
  return useQuery({
    queryKey: billingKeys.addOnPricing(),
    queryFn: getAddOnPricingList,
  });
}

export function useCreateAddOnPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAddOnPricing,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: billingKeys.addOnPricing() }),
  });
}

export function useUpdateAddOnPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof updateAddOnPricing>[1];
    }) => updateAddOnPricing(id, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: billingKeys.addOnPricing() }),
  });
}

export function useDeleteAddOnPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAddOnPricing,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: billingKeys.addOnPricing() }),
  });
}

// Tenant Add-Ons
export function useTenantAddOns(params?: {
  tenantId?: string;
  status?: AddOnStatus;
}) {
  return useQuery({
    queryKey: billingKeys.tenantAddOns(params as Record<string, string>),
    queryFn: () => getTenantAddOns(params),
  });
}

export function useCreateTenantAddOn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTenantAddOn,
    onSuccess: () => qc.invalidateQueries({ queryKey: billingKeys.all }),
  });
}

export function useUpdateTenantAddOn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof updateTenantAddOn>[1];
    }) => updateTenantAddOn(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: billingKeys.all }),
  });
}

export function useApproveTenantAddOn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveTenantAddOn,
    onSuccess: () => qc.invalidateQueries({ queryKey: billingKeys.all }),
  });
}

export function useCancelTenantAddOn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelTenantAddOn,
    onSuccess: () => qc.invalidateQueries({ queryKey: billingKeys.all }),
  });
}

export function useDeleteTenantAddOn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTenantAddOn,
    onSuccess: () => qc.invalidateQueries({ queryKey: billingKeys.all }),
  });
}

// Subscriptions
export function useSubscriptions(tenantId?: string) {
  return useQuery({
    queryKey: billingKeys.subscriptions(tenantId),
    queryFn: () => getSubscriptions(tenantId),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateSubscription(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: billingKeys.all }),
  });
}

// Payments
export function usePayments(params?: {
  tenantId?: string;
  subscriptionId?: string;
}) {
  return useQuery({
    queryKey: billingKeys.payments(params as Record<string, string>),
    queryFn: () => getPayments(params),
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updatePayment(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: billingKeys.all }),
  });
}

// Pricing Plans
export function usePricingPlans() {
  return useQuery({
    queryKey: billingKeys.pricingPlans(),
    queryFn: getPricingPlans,
  });
}

export function useUpdatePricingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      tier,
      billingCycle,
      data,
    }: {
      tier: string;
      billingCycle: string;
      data: Parameters<typeof updatePricingPlan>[2];
    }) => updatePricingPlan(tier, billingCycle, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: billingKeys.pricingPlans() }),
  });
}

// Plan Limits
export function usePlanLimits() {
  return useQuery({
    queryKey: billingKeys.planLimits(),
    queryFn: getPlanLimits,
  });
}
