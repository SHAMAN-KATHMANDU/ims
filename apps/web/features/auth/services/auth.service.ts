/**
 * Auth Service
 *
 * Single source for auth API calls. All auth HTTP requests must go through this file.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { AuthUser, TenantInfo } from "@/utils/auth";

export interface LoginResponse {
  token: string;
  user: AuthUser;
  tenant: TenantInfo;
}

interface CurrentUserResponse {
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
    const response = await api.get<CurrentUserResponse>("/auth/me");
    return response.data;
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
