/**
 * Auth Service
 *
 * Single source for auth API calls. All auth HTTP requests must go through this file.
 * Auth errors use handleApiError for consistency; login message may be customized in apiError if needed.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";
import type { AuthUser } from "@/utils/auth";

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface CurrentUserResponse {
  user: AuthUser;
}

/**
 * Login with username and password
 */
export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  try {
    const response = await api.post<LoginResponse>("/auth/login", {
      username: username.trim().toLowerCase(),
      password,
    });

    if (!response.data.token || !response.data.user) {
      throw new Error("Invalid response from server");
    }

    return response.data;
  } catch (error: unknown) {
    handleApiError(error, "login");
  }
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await api.get<CurrentUserResponse>("/auth/me");
    return response.data.user;
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
