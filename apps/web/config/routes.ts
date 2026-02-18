/**
 * Single place for workspace and protected route config.
 * Tenant is identified by the first path segment: ims.shamankathmandu.com/<slug>
 */

/** Fallback when slug is not available (e.g. redirect from root). */
export const DEFAULT_WORKSPACE = "admin";

/**
 * Root path for a tenant (e.g. /ruby, /system).
 * Use when building links; pass the tenant slug from the URL (e.g. useParams().workspace).
 */
export function getWorkspaceRoot(slug?: string): string {
  return `/${slug?.trim() || DEFAULT_WORKSPACE}`;
}

/** Default workspace root (for AuthGuard unauthorizedPath when slug is not in context). */
export const WORKSPACE_ROOT = getWorkspaceRoot();

/**
 * Login path for a tenant (e.g. /ruby/login).
 */
export function getLoginPath(slug: string): string {
  return `/${slug.trim()}/login`;
}

/**
 * Returns true if pathname is a tenant login route (e.g. /ruby/login).
 */
export function isLoginPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length >= 2 && segments[1] === "login";
}

/**
 * Returns true if pathname is a protected tenant route (e.g. /ruby, /ruby/crm).
 * First segment is the slug; if second is "login" it's not protected.
 */
export function isProtectedPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 1 || !segments[0]) return false;
  if (segments.length >= 2 && segments[1] === "login") return false;
  return true;
}

/**
 * Extracts tenant slug from pathname (first segment). e.g. /ruby/login -> "ruby".
 */
export function getSlugFromPathname(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] || null;
}
