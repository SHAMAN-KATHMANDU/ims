/**
 * Auth Service
 *
 * Single source for auth API calls. All auth HTTP requests must go through this file.
 * Auth errors use handleApiError for consistency; login message may be customized in apiError if needed.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";
import type { AuthUser, TenantInfo } from "@/utils/auth";
import type { InternalAxiosRequestConfig } from "axios";

export interface LoginResponse {
  user: AuthUser;
  tenant: TenantInfo;
}

interface CurrentUserResponse {
  user: AuthUser;
  tenant: TenantInfo;
}

interface RefreshResponse {
  token?: string;
  tenant: TenantInfo;
}

/**
 * Login with username and password.
 * Optionally pass a tenant slug for multi-tenant login.
 */
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

    if (!response.data.user) {
      throw new Error("Invalid response from server");
    }

    return response.data;
  } catch (error: unknown) {
    handleApiError(error, "login");
  }
}

/**
 * Get current user info (includes tenant info)
 */
export async function getCurrentUser(): Promise<CurrentUserResponse | null> {
  try {
    const response = await api.get<CurrentUserResponse>("/auth/me");
    return response.data;
  } catch {
    return null;
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Ignore errors on logout - we'll clear local state anyway
  }
}

export async function refreshSession(): Promise<RefreshResponse> {
  const requestConfig: Partial<InternalAxiosRequestConfig> & {
    skipGlobalErrorToast?: boolean;
  } = {
    skipGlobalErrorToast: true,
  };
  const response = await api.post<RefreshResponse>(
    "/auth/refresh",
    {},
    requestConfig as InternalAxiosRequestConfig,
  );
  return response.data as RefreshResponse;
}
