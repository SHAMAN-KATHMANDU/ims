import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getSlugFromPathname,
  getWorkspaceRoot,
  getLoginPath,
  isLoginPath,
  isProtectedPath,
} from "@/constants/routes";

/**
 * Next.js Proxy for Route Protection
 *
 * Tenant is identified by the first path segment (e.g. /ruby/login, /ruby).
 * - / → show landing (no redirect to login; user must use org URL)
 * - /:slug/login → auth route (allow without token)
 * - /:slug/... (rest) → protected (redirect to /:slug/login if no token)
 */

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authStorage = request.cookies.get("auth-storage");
  let hasToken = false;
  if (authStorage?.value) {
    try {
      const parsed = JSON.parse(authStorage.value);
      hasToken = !!parsed?.state?.token;
    } catch {
      hasToken = false;
    }
  }

  // Legacy /login (no slug): redirect to root
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Root: if logged in, redirect to tenant root (we use default slug; they may have tenant in store)
  if (pathname === "/") {
    if (hasToken) {
      // Prefer tenant from cookie if available
      try {
        const parsed = authStorage?.value
          ? JSON.parse(authStorage.value)
          : null;
        const slug = parsed?.state?.tenant?.slug;
        const root = slug ? getWorkspaceRoot(slug) : getWorkspaceRoot();
        return NextResponse.redirect(new URL(root, request.url));
      } catch {
        return NextResponse.redirect(new URL(getWorkspaceRoot(), request.url));
      }
    }
    // Not logged in: allow / (landing page)
    return NextResponse.next();
  }

  // Bare paths (no workspace prefix): redirect to /{tenant}/{path} when logged in
  const BARE_PATHS = ["/onboarding", "/sales", "/crm", "/product", "/settings"];
  if (hasToken && BARE_PATHS.includes(pathname)) {
    try {
      const parsed = authStorage?.value ? JSON.parse(authStorage.value) : null;
      const tenantSlug = parsed?.state?.tenant?.slug?.trim();
      if (tenantSlug) {
        return NextResponse.redirect(
          new URL(`/${tenantSlug}${pathname}`, request.url),
        );
      }
    } catch {
      // Fall through to normal handling
    }
  }

  const slug = getSlugFromPathname(pathname);
  const loginRoute = slug ? getLoginPath(slug) : null;
  const isLogin = isLoginPath(pathname);
  const isProtected = isProtectedPath(pathname);

  if (isProtected && !hasToken && slug) {
    const loginUrl = new URL(loginRoute!, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLogin && hasToken && slug) {
    return NextResponse.redirect(new URL(getWorkspaceRoot(slug), request.url));
  }

  return NextResponse.next();
}

// Configure which routes the proxy runs on
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
