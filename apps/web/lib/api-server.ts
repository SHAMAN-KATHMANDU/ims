/**
 * Server-safe API client using native fetch.
 * Use in Server Components and Route Handlers. Do NOT use in client components.
 *
 * - No axios, no Zustand (useAuthStore)
 * - Forwards Cookie and X-Tenant-Slug via headers
 *
 * ## When to use *Server services vs axios
 *
 * **Use *Server services (fetchServer, memberServiceServer, authServiceServer, etc.) when:**
 * - In Server Components (async page.tsx, layout.tsx)
 * - In Route Handlers (app/api/.../route.ts)
 * - For initial data fetches that should be server-rendered
 *
 * **Use axios (lib/axios) when:**
 * - In Client Components ("use client")
 * - For mutations (create, update, delete)
 * - For client-side refetches (React Query)
 * - When you need interceptors (401 handling, toasts, tenant injection from Zustand)
 *
 * Server services receive cookie and tenantSlug as explicit arguments; axios
 * injects them via interceptors and Zustand.
 *
 * ## Streaming boundary strategy
 *
 * - `loading.tsx` = route boundary: Next.js automatically wraps the route segment in
 *   Suspense and shows loading.tsx as fallback during navigation/server fetch.
 * - Use component-level `<Suspense>` only when you have nested async children that
 *   should stream independently (e.g. a sidebar that loads separately from main content).
 *
 * ## Intercepting routes (@modal pattern)
 *
 * Use when: a list/detail flow should show detail in a modal on soft navigation,
 * but full page on direct URL or refresh (shareable links).
 *
 * Steps:
 * 1. Add @modal parallel route to the layout that wraps both list and detail.
 * 2. Add @modal/default.tsx returning null.
 * 3. Add @modal/(.)segment/[id]/edit/page.tsx (or similar) to intercept the route.
 *    Convention: (.) = same level, (..) = one level up.
 * 4. Render the layout's modal slot alongside children.
 * 5. List page: use Link or router.push to the detail URL (not local dialog state).
 *
 * Example: product edit. See app/[workspace]/(admin)/@modal/(.)product/[id]/edit/.
 */

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export interface FetchServerInit extends Omit<RequestInit, "headers"> {
  headers?: HeadersInit;
  /** Optional tenant slug for X-Tenant-Slug header */
  tenantSlug?: string;
  /** Cookie header from cookies() - required for authenticated requests */
  cookie?: string;
}

/**
 * Server-safe fetch for API calls. Use in Server Components and Route Handlers.
 */
export async function fetchServer(
  basePath: string,
  init?: FetchServerInit,
): Promise<Response> {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const path = basePath.startsWith("/") ? basePath : `/${basePath}`;
  const url = `${baseUrl}${path}`;

  const headers = new Headers(init?.headers);

  if (init?.cookie) {
    headers.set("Cookie", init.cookie);
  }
  if (init?.tenantSlug) {
    headers.set("X-Tenant-Slug", init.tenantSlug);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const { cookie: _cookie, tenantSlug: _tenantSlug, ...rest } = init || {};
  return fetch(url, {
    ...rest,
    headers,
    credentials: "include",
  });
}
