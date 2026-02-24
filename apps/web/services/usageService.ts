/**
 * Usage Service — tenant-scoped resource usage and add-on management.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";

// ============================================
// Types
// ============================================

export type LimitedResource =
  | "users"
  | "products"
  | "locations"
  | "members"
  | "categories"
  | "contacts";

export type AddOnType =
  | "EXTRA_USER"
  | "EXTRA_PRODUCT"
  | "EXTRA_LOCATION"
  | "EXTRA_MEMBER"
  | "EXTRA_CATEGORY"
  | "EXTRA_CONTACT";

export type AddOnStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export interface ResourceUsage {
  resource: LimitedResource;
  current: number;
  baseLimit: number;
  addOnQuantity: number;
  effectiveLimit: number;
  usagePercent: number;
  isAtLimit: boolean;
}

export interface TenantAddOn {
  id: string;
  tenantId: string;
  type: AddOnType;
  quantity: number;
  status: AddOnStatus;
  periodStart: string | null;
  periodEnd: string | null;
  paymentId: string | null;
  notes: string | null;
  requestedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddOnPricing {
  id: string;
  type: AddOnType;
  tier: string | null;
  billingCycle: string;
  unitPrice: string;
  minQuantity: number;
  maxQuantity: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanWithPricing {
  id: string;
  name: string;
  slug: string;
  tier: string;
  rank: number;
  description: string | null;
  priceMonthly: number | null;
  priceAnnual: number | null;
}

// ============================================
// API (response shape: { success, data: payload })
// ============================================

interface ApiWrapped<T> {
  data?: T;
}

export async function getPlansWithPricing(): Promise<PlanWithPricing[]> {
  try {
    const response =
      await api.get<ApiWrapped<{ plans: PlanWithPricing[] }>>("/usage/plans");
    return response.data?.data?.plans ?? [];
  } catch (error) {
    handleApiError(error, "fetch plans with pricing");
  }
}

export async function getUsage(): Promise<{
  usage: ResourceUsage[];
  plan: string;
}> {
  try {
    const response =
      await api.get<ApiWrapped<{ usage: ResourceUsage[]; plan: string }>>(
        "/usage",
      );
    const payload = response.data?.data;
    if (!payload) {
      return { usage: [], plan: "" };
    }
    return payload;
  } catch (error) {
    handleApiError(error, "fetch usage");
  }
}

export async function getResourceUsage(
  resource: LimitedResource,
): Promise<ResourceUsage> {
  try {
    const response = await api.get<ApiWrapped<ResourceUsage>>(
      `/usage/${resource}`,
    );
    const payload = response.data?.data;
    if (!payload) {
      throw new Error("Invalid response from server");
    }
    return payload;
  } catch (error) {
    handleApiError(error, `fetch ${resource} usage`);
  }
}

export async function getAddOns(): Promise<TenantAddOn[]> {
  try {
    const response =
      await api.get<ApiWrapped<{ addOns: TenantAddOn[] }>>("/usage/add-ons");
    return response.data?.data?.addOns ?? [];
  } catch (error) {
    handleApiError(error, "fetch add-ons");
  }
}

export async function getAddOnPricing(): Promise<AddOnPricing[]> {
  try {
    const response = await api.get<ApiWrapped<{ pricing: AddOnPricing[] }>>(
      "/usage/add-ons/pricing",
    );
    return response.data?.data?.pricing ?? [];
  } catch (error) {
    handleApiError(error, "fetch add-on pricing");
  }
}

export async function requestAddOn(data: {
  type: AddOnType;
  quantity?: number;
  notes?: string;
}): Promise<TenantAddOn> {
  try {
    const response = await api.post<
      ApiWrapped<{ addOn: TenantAddOn; message: string }>
    >("/usage/add-ons/request", data);
    const addOn = response.data?.data?.addOn;
    if (!addOn) {
      throw new Error("Invalid response from server");
    }
    return addOn;
  } catch (error) {
    handleApiError(error, "request add-on");
  }
}
