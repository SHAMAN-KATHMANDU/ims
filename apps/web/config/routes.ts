/**
 * Single place for workspace and protected route config.
 * Do not hardcode '/admin' or protected list elsewhere.
 */

/** Default workspace segment (e.g. URL is /admin/...). */
export const DEFAULT_WORKSPACE = "admin";

/** Route prefixes that require authentication. Used by middleware. */
export const PROTECTED_ROUTE_PREFIXES = ["/admin"] as const;

/** Paths that are only for unauthenticated users (e.g. login). */
export const AUTH_ROUTES = ["/login"] as const;

/** Root path of the default workspace (e.g. redirect after login, unauthorized fallback). */
export function getWorkspaceRoot(): string {
  return `/${DEFAULT_WORKSPACE}`;
}

/** Same as getWorkspaceRoot(); use for AuthGuard unauthorizedPath so role failures redirect to workspace. */
export const WORKSPACE_ROOT = getWorkspaceRoot();
