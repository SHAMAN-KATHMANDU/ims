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

// ============================================
// API
// ============================================

export async function getUsage(): Promise<{
  usage: ResourceUsage[];
  plan: string;
}> {
  try {
    const response = await api.get<{ usage: ResourceUsage[]; plan: string }>(
      "/usage",
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch usage");
  }
}

export async function getResourceUsage(
  resource: LimitedResource,
): Promise<ResourceUsage> {
  try {
    const response = await api.get<ResourceUsage>(`/usage/${resource}`);
    return response.data;
  } catch (error) {
    handleApiError(error, `fetch ${resource} usage`);
  }
}

export async function getAddOns(): Promise<TenantAddOn[]> {
  try {
    const response = await api.get<{ addOns: TenantAddOn[] }>("/usage/add-ons");
    return response.data.addOns ?? [];
  } catch (error) {
    handleApiError(error, "fetch add-ons");
  }
}

export async function getAddOnPricing(): Promise<AddOnPricing[]> {
  try {
    const response = await api.get<{ pricing: AddOnPricing[] }>(
      "/usage/add-ons/pricing",
    );
    return response.data.pricing ?? [];
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
    const response = await api.post<{ addOn: TenantAddOn; message: string }>(
      "/usage/add-ons/request",
      data,
    );
    return response.data.addOn;
  } catch (error) {
    handleApiError(error, "request add-on");
  }
}
