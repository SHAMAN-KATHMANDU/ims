/**
 * Platform Billing Service — platform admin endpoints for add-on pricing,
 * tenant add-ons, subscriptions, and payments.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";
import type {
  AddOnType,
  AddOnStatus,
  AddOnPricing,
  TenantAddOn,
} from "./usageService";

// ============================================
// Types
// ============================================

export type { AddOnPricing, TenantAddOn };

export interface PlatformTenantAddOn extends TenantAddOn {
  tenant?: { id: string; name: string; slug: string };
}

export interface Subscription {
  id: string;
  tenantId: string;
  plan: string;
  billingCycle: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  gracePeriodEnd: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: { id: string; name: string; slug: string };
  _count?: { payments: number };
}

export interface TenantPayment {
  id: string;
  tenantId: string;
  subscriptionId: string;
  amount: string;
  currency: string;
  gateway: string;
  gatewayTxnId: string | null;
  status: string;
  paidFor: string;
  billingCycle: string;
  periodStart: string;
  periodEnd: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: { id: string; name: string; slug: string };
  subscription?: {
    id: string;
    plan: string;
    billingCycle: string;
    status: string;
  };
}

export interface PricingPlan {
  id: string;
  tier: string;
  billingCycle: string;
  price: string;
  originalPrice: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Add-On Pricing CRUD
// ============================================

export async function getAddOnPricingList(): Promise<AddOnPricing[]> {
  try {
    const response = await api.get<{ pricing: AddOnPricing[] }>(
      "/platform/add-on-pricing",
    );
    return response.data.pricing ?? [];
  } catch (error) {
    handleApiError(error, "fetch add-on pricing");
  }
}

export async function createAddOnPricing(data: {
  type: AddOnType;
  tier?: string | null;
  billingCycle?: string;
  unitPrice: number;
  minQuantity?: number;
  maxQuantity?: number | null;
  isActive?: boolean;
}): Promise<AddOnPricing> {
  try {
    const response = await api.post<{ pricing: AddOnPricing }>(
      "/platform/add-on-pricing",
      data,
    );
    return response.data.pricing;
  } catch (error) {
    handleApiError(error, "create add-on pricing");
  }
}

export async function updateAddOnPricing(
  id: string,
  data: {
    unitPrice?: number;
    minQuantity?: number;
    maxQuantity?: number | null;
    isActive?: boolean;
  },
): Promise<AddOnPricing> {
  try {
    const response = await api.put<{ pricing: AddOnPricing }>(
      `/platform/add-on-pricing/${id}`,
      data,
    );
    return response.data.pricing;
  } catch (error) {
    handleApiError(error, "update add-on pricing");
  }
}

export async function deleteAddOnPricing(id: string): Promise<void> {
  try {
    await api.delete(`/platform/add-on-pricing/${id}`);
  } catch (error) {
    handleApiError(error, "delete add-on pricing");
  }
}

// ============================================
// Tenant Add-Ons Management
// ============================================

export async function getTenantAddOns(params?: {
  tenantId?: string;
  status?: AddOnStatus;
}): Promise<PlatformTenantAddOn[]> {
  try {
    const response = await api.get<{ addOns: PlatformTenantAddOn[] }>(
      "/platform/tenant-add-ons",
      {
        params,
      },
    );
    return response.data.addOns ?? [];
  } catch (error) {
    handleApiError(error, "fetch tenant add-ons");
  }
}

export async function createTenantAddOn(data: {
  tenantId: string;
  type: AddOnType;
  quantity?: number;
  status?: AddOnStatus;
  periodStart?: string;
  periodEnd?: string;
  notes?: string;
}): Promise<PlatformTenantAddOn> {
  try {
    const response = await api.post<{ addOn: PlatformTenantAddOn }>(
      "/platform/tenant-add-ons",
      data,
    );
    return response.data.addOn;
  } catch (error) {
    handleApiError(error, "create tenant add-on");
  }
}

export async function updateTenantAddOn(
  id: string,
  data: {
    quantity?: number;
    status?: AddOnStatus;
    periodStart?: string;
    periodEnd?: string;
    notes?: string;
  },
): Promise<PlatformTenantAddOn> {
  try {
    const response = await api.put<{ addOn: PlatformTenantAddOn }>(
      `/platform/tenant-add-ons/${id}`,
      data,
    );
    return response.data.addOn;
  } catch (error) {
    handleApiError(error, "update tenant add-on");
  }
}

export async function approveTenantAddOn(
  id: string,
): Promise<PlatformTenantAddOn> {
  try {
    const response = await api.patch<{ addOn: PlatformTenantAddOn }>(
      `/platform/tenant-add-ons/${id}/approve`,
    );
    return response.data.addOn;
  } catch (error) {
    handleApiError(error, "approve tenant add-on");
  }
}

export async function cancelTenantAddOn(
  id: string,
): Promise<PlatformTenantAddOn> {
  try {
    const response = await api.patch<{ addOn: PlatformTenantAddOn }>(
      `/platform/tenant-add-ons/${id}/cancel`,
    );
    return response.data.addOn;
  } catch (error) {
    handleApiError(error, "cancel tenant add-on");
  }
}

export async function deleteTenantAddOn(id: string): Promise<void> {
  try {
    await api.delete(`/platform/tenant-add-ons/${id}`);
  } catch (error) {
    handleApiError(error, "delete tenant add-on");
  }
}

// ============================================
// Subscriptions (existing platform endpoints)
// ============================================

export async function getSubscriptions(
  tenantId?: string,
): Promise<Subscription[]> {
  try {
    const response = await api.get<{ subscriptions: Subscription[] }>(
      "/platform/subscriptions",
      {
        params: tenantId ? { tenantId } : undefined,
      },
    );
    return response.data.subscriptions ?? [];
  } catch (error) {
    handleApiError(error, "fetch subscriptions");
  }
}

export async function updateSubscription(
  id: string,
  data: Record<string, unknown>,
): Promise<Subscription> {
  try {
    const response = await api.put<{ subscription: Subscription }>(
      `/platform/subscriptions/${id}`,
      data,
    );
    return response.data.subscription;
  } catch (error) {
    handleApiError(error, "update subscription");
  }
}

// ============================================
// Payments (existing platform endpoints)
// ============================================

export async function getPayments(params?: {
  tenantId?: string;
  subscriptionId?: string;
}): Promise<TenantPayment[]> {
  try {
    const response = await api.get<{ payments: TenantPayment[] }>(
      "/platform/payments",
      { params },
    );
    return response.data.payments ?? [];
  } catch (error) {
    handleApiError(error, "fetch payments");
  }
}

export async function updatePayment(
  id: string,
  data: Record<string, unknown>,
): Promise<TenantPayment> {
  try {
    const response = await api.put<{ payment: TenantPayment }>(
      `/platform/payments/${id}`,
      data,
    );
    return response.data.payment;
  } catch (error) {
    handleApiError(error, "update payment");
  }
}

// ============================================
// Pricing Plans (existing platform endpoints)
// ============================================

export async function getPricingPlans(): Promise<PricingPlan[]> {
  try {
    const response = await api.get<{ pricingPlans: PricingPlan[] }>(
      "/platform/pricing-plans",
    );
    return response.data.pricingPlans ?? [];
  } catch (error) {
    handleApiError(error, "fetch pricing plans");
  }
}

export async function updatePricingPlan(
  tier: string,
  billingCycle: string,
  data: { price?: number; originalPrice?: number | null; isActive?: boolean },
): Promise<PricingPlan> {
  try {
    const response = await api.put<{ pricingPlan: PricingPlan }>(
      `/platform/pricing-plans/${tier}/${billingCycle}`,
      data,
    );
    return response.data.pricingPlan;
  } catch (error) {
    handleApiError(error, "update pricing plan");
  }
}

// ============================================
// Plan Limits (existing platform endpoints)
// ============================================

export interface PlanLimit {
  id: string;
  tier: string;
  maxUsers: number;
  maxProducts: number;
  maxLocations: number;
  maxMembers: number;
  maxCategories: number;
  maxContacts: number;
  bulkUpload: boolean;
  analytics: boolean;
  promoManagement: boolean;
  auditLogs: boolean;
  apiAccess: boolean;
}

export async function getPlanLimits(): Promise<PlanLimit[]> {
  try {
    const response = await api.get<{ planLimits: PlanLimit[] }>(
      "/platform/plan-limits",
    );
    return response.data.planLimits ?? [];
  } catch (error) {
    handleApiError(error, "fetch plan limits");
  }
}
