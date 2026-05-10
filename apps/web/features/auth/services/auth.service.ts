/**
 * Auth Service
 *
 * Single source for auth API calls. All auth HTTP requests must go through this file.
 */

import axios from "axios";
import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { fetchCurrentUser as fetchCurrentUserApi } from "@/lib/auth-api";
import type { AuthUser, TenantInfo } from "@/utils/auth";

/**
 * Error thrown by `changeMyPassword` that preserves the HTTP status code
 * so callers can distinguish 401 (wrong current password), 429 (rate-limited),
 * and 400 (validation) without parsing messages.
 */
export class ChangeMyPasswordError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ChangeMyPasswordError";
  }
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
  tenant: TenantInfo;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

/**
 * Exchange a refresh token for a fresh access + refresh pair.
 * Used by the axios response interceptor on 401 — must NOT be called
 * through the same `api` instance to avoid recursing into the interceptor.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<RefreshTokenResponse> {
  const response = await axios.post<RefreshTokenResponse>(
    `${api.defaults.baseURL}/auth/refresh`,
    { refreshToken },
    { headers: { "Content-Type": "application/json" } },
  );
  return response.data;
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

// ─── Change my password (self-service) ────────────────────────────────────────

export interface ChangeMyPasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ChangeMyPasswordResponse {
  message: string;
  user: {
    id: string;
    username: string;
    tenantId: string;
  };
}

/**
 * Change the authenticated user's own password.
 *
 * Calls `POST /auth/me/password`. Backend enforces `currentPassword` min 1,
 * `newPassword` min 8 max 128, rate-limits to 5 attempts per 15 minutes per
 * user, and writes a SECURITY audit log on success.
 *
 * On failure, throws a `ChangeMyPasswordError` whose `.status` mirrors the
 * HTTP status so the caller can map to field-level / toast messages.
 */
export async function changeMyPassword(
  data: ChangeMyPasswordData,
): Promise<ChangeMyPasswordResponse> {
  try {
    const response = await api.post<ChangeMyPasswordResponse>(
      "/auth/me/password",
      data,
    );
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const raw = error.response.data as { message?: unknown } | undefined;
      const message =
        typeof raw?.message === "string" && raw.message.trim() !== ""
          ? raw.message.trim()
          : `Request failed with status ${status}`;
      throw new ChangeMyPasswordError(message, status);
    }
    handleApiError(error, "change password");
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
