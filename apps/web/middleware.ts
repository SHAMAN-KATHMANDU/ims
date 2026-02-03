import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  PROTECTED_ROUTE_PREFIXES,
  AUTH_ROUTES,
  getWorkspaceRoot,
} from "@/config/routes";

/**
 * Next.js Middleware for Route Protection
 *
 * This runs on the server BEFORE the page loads, preventing
 * flash of content and providing first-line security.
 *
 * Note: We check for token existence only. Role-based access
 * is handled client-side where we have the full user object.
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from Zustand persisted storage
  // Zustand persist middleware stores in localStorage, but we can also check cookies
  // For middleware, we need to use cookies since localStorage isn't available server-side
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

  const workspaceRoot = getWorkspaceRoot();

  if (pathname === "/") {
    if (hasToken) {
      return NextResponse.redirect(new URL(workspaceRoot, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isProtectedRoute && !hasToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && hasToken) {
    return NextResponse.redirect(new URL(workspaceRoot, request.url));
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
