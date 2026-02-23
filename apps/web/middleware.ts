import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getSlugFromPathname,
  getWorkspaceRoot,
  getLoginPath,
  isLoginPath,
  isProtectedPath,
} from "@/config/routes";

/**
 * Next.js Middleware for Route Protection
 *
 * Runs on Edge Runtime by default. No Node APIs (e.g. fs, path) are available.
 *
 * Tenant is identified by the first path segment (e.g. /ruby/login, /ruby).
 * - / → show landing (no redirect to login; user must use org URL)
 * - /:slug/login → auth route (allow without token)
 * - /:slug/... (rest) → protected (redirect to /:slug/login if no token)
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Use access_token (HttpOnly) as source of truth for auth. auth-storage can be stale.
  const accessTokenCookie = request.cookies.get("access_token");
  const authStorage = request.cookies.get("auth-storage");
  let storedUser: { role?: string } | null = null;
  let storedTenantSlug: string | null = null;
  if (authStorage?.value) {
    try {
      const parsed = JSON.parse(authStorage.value);
      storedUser = parsed?.state?.user ?? null;
      storedTenantSlug = parsed?.state?.tenant?.slug ?? null;
    } catch {
      storedUser = null;
      storedTenantSlug = null;
    }
  }
  // Require actual access_token for protected routes; authStorage alone may be stale (expired session)
  const hasToken = !!accessTokenCookie?.value;

  // Legacy /login (no slug): redirect to root
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/system/login", request.url));
  }

  // Root: if logged in, redirect to tenant root (we use default slug; they may have tenant in store)
  if (pathname === "/") {
    if (hasToken) {
      const root = storedTenantSlug
        ? getWorkspaceRoot(storedTenantSlug)
        : getWorkspaceRoot();
      return NextResponse.redirect(new URL(root, request.url));
    }
    // Not logged in: allow / (landing page)
    return NextResponse.next();
  }

  const urlSlug = getSlugFromPathname(pathname);
  const loginRoute = urlSlug ? getLoginPath(urlSlug) : null;
  const isLogin = isLoginPath(pathname);
  const isProtected = isProtectedPath(pathname);

  if (isProtected && !hasToken && urlSlug) {
    const loginUrl = new URL(loginRoute!, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Only redirect away from login if we have a valid access token.
  if (isLogin && hasToken && urlSlug) {
    return NextResponse.redirect(
      new URL(getWorkspaceRoot(urlSlug), request.url),
    );
  }

  // Enforce tenant slug: if logged-in tenant user is on wrong slug URL, redirect to their tenant
  if (isProtected && hasToken && urlSlug) {
    try {
      const tenantSlug = storedTenantSlug;
      const userRole = storedUser?.role;
      const isPlatformRoute = pathname.startsWith(`/${urlSlug}/platform`);
      // Platform admins can access any workspace URL
      if (userRole === "platformAdmin") {
        return NextResponse.next();
      }
      // Tenant users should get an explicit unauthorized route for platform screens.
      if (isPlatformRoute) {
        return NextResponse.redirect(new URL("/401", request.url));
      }
      // Tenant users must use their tenant's slug in the URL
      if (tenantSlug && urlSlug.toLowerCase() !== tenantSlug.toLowerCase()) {
        const correctPath = pathname.replace(
          new RegExp(`^/${urlSlug}(/|$)`, "i"),
          `/${tenantSlug}$1`,
        );
        return NextResponse.redirect(new URL(correctPath, request.url));
      }
    } catch {
      // If cookie parse fails, allow through (auth will be revalidated)
    }
  }

  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)",
  ],
};
