/**
 * Server-safe Auth Service.
 * Use in Server Components and Route Handlers. Do NOT use in client components.
 */

import { fetchServer } from "@/lib/api-server";
import type { AuthUser, TenantInfo } from "@/utils/auth";

export interface CurrentUserServerResponse {
  user: AuthUser;
  tenant: TenantInfo;
}

export interface WorkspaceInfoServerResponse {
  workspace: {
    slug: string;
    name: string;
  };
}

/**
 * Get current user from session. Use in Server Components for auth checks.
 * Returns null if not authenticated.
 */
export async function getCurrentUserServer(
  cookie: string | null | undefined,
): Promise<CurrentUserServerResponse | null> {
  const response = await fetchServer("/auth/me", {
    cookie: cookie ?? undefined,
  });

  if (!response.ok) {
    return null;
  }

  const json = await response.json();
  return json;
}

/**
 * Get workspace info by slug. Public endpoint, no auth required.
 * Used on login page to display workspace name.
 */
export async function getWorkspaceInfoServer(
  slug: string,
): Promise<WorkspaceInfoServerResponse | null> {
  if (!slug?.trim()) return null;

  try {
    const response = await fetchServer(
      `/auth/workspace/${encodeURIComponent(slug.trim().toLowerCase())}`,
    );

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    return json;
  } catch {
    return null;
  }
}
