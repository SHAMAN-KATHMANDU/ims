/**
 * Tenant Service — Platform admin tenant CRUD.
 * All requests go to /platform/tenants and require platformAdmin role.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

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
  customMaxUsers?: number | null;
  customMaxProducts?: number | null;
  customMaxLocations?: number | null;
  customMaxMembers?: number | null;
  customMaxCustomers?: number | null;
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
  /** Override plan limits for this tenant. -1 = unlimited, null/undefined = use plan default. */
  customMaxUsers?: number | null;
  customMaxProducts?: number | null;
  customMaxLocations?: number | null;
  customMaxMembers?: number | null;
  customMaxCustomers?: number | null;
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

export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    const response = await api.get<PlatformStats>("/platform/stats");
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch platform stats");
  }
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

export interface CreateTenantUserData {
  username: string;
  password: string;
  role: "admin" | "user" | "superAdmin";
}

export async function createTenantUser(
  tenantId: string,
  data: CreateTenantUserData,
): Promise<{ id: string; username: string; role: string }> {
  if (!tenantId?.trim()) throw new Error("Tenant ID is required");
  if (!data.username?.trim()) throw new Error("Username is required");
  if (!data.password || data.password.length < 6)
    throw new Error("Password must be at least 6 characters");
  try {
    const response = await api.post<{
      user: { id: string; username: string; role: string };
    }>(`/platform/tenants/${tenantId}/users`, data);
    return response.data.user;
  } catch (error) {
    handleApiError(error, "create tenant user");
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

// ─── Platform Password Reset Requests (escalated) ─────────────────────────────

export type PasswordResetStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ESCALATED";

export interface PlatformPasswordResetRequest {
  id: string;
  tenantId: string;
  requestedById: string;
  status: PasswordResetStatus;
  createdAt: string;
  requestedBy: { id: string; username: string; role: string };
  tenant: { id: string; name: string; slug: string };
}

export async function getPlatformResetRequests(): Promise<
  PlatformPasswordResetRequest[]
> {
  try {
    const response = await api.get<{
      requests: PlatformPasswordResetRequest[];
    }>("/platform/password-reset-requests");
    return response.data.requests ?? [];
  } catch (error) {
    handleApiError(error, "fetch platform password reset requests");
  }
}

export async function approvePlatformResetRequest(
  requestId: string,
  newPassword: string,
): Promise<void> {
  if (!requestId?.trim()) throw new Error("Request ID is required");
  if (!newPassword || newPassword.length < 8)
    throw new Error("Password must be at least 8 characters");
  try {
    await api.post(`/platform/password-reset-requests/${requestId}/approve`, {
      newPassword,
    });
  } catch (error) {
    handleApiError(error, "approve platform password reset");
  }
}
