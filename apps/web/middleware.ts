import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware for Route Protection
 *
 * This runs on the server BEFORE the page loads, preventing
 * flash of content and providing first-line security.
 *
 * Note: We check for token existence only. Role-based access
 * is handled client-side where we have the full user object.
 */

// Routes that require authentication
const protectedRoutes = ["/admin"];

// Routes only for unauthenticated users
const authRoutes = ["/login"];

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

  // Redirect root path based on auth status
  if (pathname === "/") {
    if (hasToken) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check if current path matches protected routes
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // Check if current path is an auth route (login, register, etc.)
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // Redirect to login if accessing protected route without token
  if (isProtectedRoute && !hasToken) {
    const loginUrl = new URL("/login", request.url);
    // Save the original URL to redirect back after login
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if accessing auth routes with token
  if (isAuthRoute && hasToken) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
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
