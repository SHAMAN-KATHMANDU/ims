/**
 * Tenant Service — Platform admin tenant CRUD.
 * All requests go to /platform/tenants and require platformAdmin role.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";

// ============================================
// Types
// ============================================

export type PlanTier = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "SUSPENDED"
  | "LOCKED"
  | "CANCELLED";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: PlanTier;
  planExpiresAt: string | null;
  isActive: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
  subscriptionStatus: SubscriptionStatus;
  settings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users?: number;
    products?: number;
    locations?: number;
    members?: number;
    sales?: number;
    transfers?: number;
  };
}

export interface CreateTenantData {
  name: string;
  slug: string;
  plan?: PlanTier;
  adminUsername: string;
  adminPassword: string;
}

export interface UpdateTenantData {
  name?: string;
  slug?: string;
  isActive?: boolean;
  subscriptionStatus?: SubscriptionStatus;
  isTrial?: boolean;
  trialEndsAt?: string | null;
  planExpiresAt?: string | null;
  settings?: Record<string, unknown> | null;
}

// ============================================
// API
// ============================================

interface ListTenantsResponse {
  tenants: Tenant[];
}

interface TenantResponse {
  tenant: Tenant;
}

interface CreateTenantResponse {
  message: string;
  tenant: Tenant;
  adminUser: { id: string; username: string; role: string };
}

export async function getTenants(): Promise<Tenant[]> {
  try {
    const response = await api.get<ListTenantsResponse>("/platform/tenants");
    return response.data.tenants ?? [];
  } catch (error) {
    handleApiError(error, "fetch tenants");
  }
}

export async function getTenantById(id: string): Promise<Tenant> {
  if (!id?.trim()) throw new Error("Tenant ID is required");
  try {
    const response = await api.get<TenantResponse>(`/platform/tenants/${id}`);
    return response.data.tenant;
  } catch (error) {
    handleApiError(error, `fetch tenant "${id}"`);
  }
}

export async function createTenant(data: CreateTenantData): Promise<Tenant> {
  if (!data.name?.trim()) throw new Error("Name is required");
  if (!data.slug?.trim()) throw new Error("Slug is required");
  if (!data.adminUsername?.trim())
    throw new Error("Admin username is required");
  if (!data.adminPassword) throw new Error("Admin password is required");
  try {
    const response = await api.post<CreateTenantResponse>(
      "/platform/tenants",
      data,
    );
    return response.data.tenant;
  } catch (error) {
    handleApiError(error, "create tenant");
  }
}

export async function updateTenant(
  id: string,
  data: UpdateTenantData,
): Promise<Tenant> {
  if (!id?.trim()) throw new Error("Tenant ID is required");
  try {
    const response = await api.put<TenantResponse>(
      `/platform/tenants/${id}`,
      data,
    );
    return response.data.tenant;
  } catch (error) {
    handleApiError(error, `update tenant "${id}"`);
  }
}

export async function changeTenantPlan(
  id: string,
  plan: PlanTier,
  expiresAt?: string | null,
): Promise<Tenant> {
  if (!id?.trim()) throw new Error("Tenant ID is required");
  try {
    const response = await api.patch<TenantResponse>(
      `/platform/tenants/${id}/plan`,
      { plan, expiresAt },
    );
    return response.data.tenant;
  } catch (error) {
    handleApiError(error, `change plan for tenant "${id}"`);
  }
}

export async function activateTenant(id: string): Promise<Tenant> {
  if (!id?.trim()) throw new Error("Tenant ID is required");
  try {
    const response = await api.patch<TenantResponse>(
      `/platform/tenants/${id}/activate`,
      {},
    );
    return response.data.tenant;
  } catch (error) {
    handleApiError(error, `activate tenant "${id}"`);
  }
}

export async function deactivateTenant(id: string): Promise<void> {
  if (!id?.trim()) throw new Error("Tenant ID is required");
  try {
    await api.delete(`/platform/tenants/${id}`);
  } catch (error) {
    handleApiError(error, `deactivate tenant "${id}"`);
  }
}
