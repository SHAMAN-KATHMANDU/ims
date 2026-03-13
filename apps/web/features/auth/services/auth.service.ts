/**
 * Auth Service
 *
 * Single source for auth API calls. All auth HTTP requests must go through this file.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { fetchCurrentUser as fetchCurrentUserApi } from "@/lib/auth-api";
import type { AuthUser, TenantInfo } from "@/utils/auth";

export interface LoginResponse {
  token: string;
  user: AuthUser;
  tenant: TenantInfo;
}

export interface CurrentUserResponse {
  user: AuthUser;
  tenant: TenantInfo;
}

export async function login(
  username: string,
  password: string,
  tenantSlug?: string,
): Promise<LoginResponse> {
  try {
    const headers: Record<string, string> = {};
    if (tenantSlug) {
      headers["X-Tenant-Slug"] = tenantSlug;
    }

    const response = await api.post<LoginResponse>(
      "/auth/login",
      {
        username: username.trim().toLowerCase(),
        password,
      },
      { headers },
    );

    if (!response.data.token || !response.data.user) {
      throw new Error("Invalid response from server");
    }

    return response.data;
  } catch (error: unknown) {
    handleApiError(error, "login");
  }
}

export async function getCurrentUser(): Promise<CurrentUserResponse | null> {
  try {
    return await fetchCurrentUserApi();
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Ignore errors on logout - we'll clear local state anyway
  }
}

export interface ForgotPasswordResponse {
  message: string;
}

/** Fetch org name by slug (public). Returns org name or null if not found. */
export async function getOrgNameBySlug(slug: string): Promise<string | null> {
  try {
    const response = await api.get<{ name: string }>("/auth/org-name", {
      params: { slug: slug.trim().toLowerCase() },
    });
    return response.data?.name ?? null;
  } catch {
    return null;
  }
}

export async function requestPasswordReset(
  username: string,
  tenantSlug: string,
): Promise<ForgotPasswordResponse> {
  try {
    const response = await api.post<ForgotPasswordResponse>(
      "/auth/forgot-password",
      { username: username.trim().toLowerCase() },
      { headers: { "X-Tenant-Slug": tenantSlug } },
    );
    return response.data;
  } catch (error: unknown) {
    handleApiError(error, "request password reset");
  }
}
