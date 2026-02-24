/**
 * Tenant Service — Platform admin tenant CRUD.
 * All requests go to /platform/tenants and require platformAdmin role.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";

// ============================================
// Types
// ============================================

export type PlanTier = "STARTER" | "PROFESSIONAL" | "BUSINESS" | "ENTERPRISE";

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
  users?: { id: string; username: string; role: string }[];
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

export interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  totalUsers: number;
  totalSales: number;
  planDistribution: Array<{ plan: string; count: number }>;
}

// ============================================
// API (response shape: { success, data: payload })
// ============================================

interface ApiWrapped<T> {
  data?: T;
}

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

export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    const response =
      await api.get<ApiWrapped<PlatformStats>>("/platform/stats");
    const payload = response.data?.data;
    if (!payload) throw new Error("Invalid response from server");
    return payload;
  } catch (error) {
    handleApiError(error, "fetch platform stats");
  }
}

export async function getTenants(): Promise<Tenant[]> {
  try {
    const response =
      await api.get<ApiWrapped<ListTenantsResponse>>("/platform/tenants");
    return response.data?.data?.tenants ?? [];
  } catch (error) {
    handleApiError(error, "fetch tenants");
  }
}

export async function getTenantById(id: string): Promise<Tenant> {
  if (!id?.trim()) throw new Error("Tenant ID is required");
  try {
    const response = await api.get<ApiWrapped<TenantResponse>>(
      `/platform/tenants/${id}`,
    );
    const tenant = response.data?.data?.tenant;
    if (!tenant) throw new Error("Invalid response from server");
    return tenant;
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
    const response = await api.post<ApiWrapped<CreateTenantResponse>>(
      "/platform/tenants",
      data,
    );
    const tenant = response.data?.data?.tenant;
    if (!tenant) throw new Error("Invalid response from server");
    return tenant;
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
    const response = await api.put<ApiWrapped<TenantResponse>>(
      `/platform/tenants/${id}`,
      data,
    );
    const tenant = response.data?.data?.tenant;
    if (!tenant) throw new Error("Invalid response from server");
    return tenant;
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
    const response = await api.patch<ApiWrapped<TenantResponse>>(
      `/platform/tenants/${id}/plan`,
      { plan, expiresAt },
    );
    const tenant = response.data?.data?.tenant;
    if (!tenant) throw new Error("Invalid response from server");
    return tenant;
  } catch (error) {
    handleApiError(error, `change plan for tenant "${id}"`);
  }
}

export async function activateTenant(id: string): Promise<Tenant> {
  if (!id?.trim()) throw new Error("Tenant ID is required");
  try {
    const response = await api.patch<ApiWrapped<TenantResponse>>(
      `/platform/tenants/${id}/activate`,
      {},
    );
    const tenant = response.data?.data?.tenant;
    if (!tenant) throw new Error("Invalid response from server");
    return tenant;
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

export async function resetTenantUserPassword(
  tenantId: string,
  userId: string,
  newPassword: string,
): Promise<void> {
  if (!tenantId?.trim()) throw new Error("Tenant ID is required");
  if (!userId?.trim()) throw new Error("User ID is required");
  if (!newPassword || newPassword.length < 6)
    throw new Error("Password must be at least 6 characters");
  try {
    await api.patch(`/platform/tenants/${tenantId}/users/${userId}/password`, {
      newPassword,
    });
  } catch (error) {
    handleApiError(error, "reset tenant user password");
  }
}
