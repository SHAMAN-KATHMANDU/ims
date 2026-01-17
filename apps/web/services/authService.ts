/**
 * Auth Service
 *
 * Service layer for authentication operations.
 * All API calls related to authentication go here.
 */

import api from "@/lib/axios";
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
    // Handle axios errors
    if (isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;

      // Network error
      if (error.code === "ERR_NETWORK") {
        throw new Error(
          "Cannot connect to server. Please check if the API is running.",
        );
      }

      throw new Error(message || "Login failed");
    }

    throw new Error("An unexpected error occurred during login");
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

// Type guard for axios errors
function isAxiosError(error: unknown): error is {
  response?: { data?: { message?: string }; status?: number };
  message?: string;
  code?: string;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    ("response" in error || "message" in error)
  );
}
