/**
 * Auth API — Low-level fetch for /auth/me.
 * Used by auth store for refresh; auth service re-exports for consumers.
 */

import api from "@/lib/axios";
import type { AuthUser, TenantInfo } from "@/utils/auth";

export interface CurrentUserData {
  user: AuthUser;
  tenant: TenantInfo;
}

/**
 * Fetches current user and tenant from /auth/me.
 * Returns null on error (e.g. 401, network). Used for silent refresh.
 */
export async function fetchCurrentUser(): Promise<CurrentUserData | null> {
  try {
    const { data } = await api.get<CurrentUserData>("/auth/me");
    return data;
  } catch {
    return null;
  }
}
