/**
 * Tenant-site middleware — runs on every request before page handlers.
 *
 * 1. Reads the incoming Host header.
 * 2. Calls /api/v1/internal/resolve-host (with the shared secret) to map
 *    the host to a tenant. In-memory cache 60s to avoid hammering the API.
 * 3. If the host doesn't resolve to a published tenant, returns 404 early
 *    — no page handler runs, no database is touched.
 * 4. If it resolves, attaches x-tenant-id / x-tenant-slug / x-host to the
 *    request so downstream server components can read them via headers().
 */

import { NextResponse, type NextRequest } from "next/server";

const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  resolved: boolean;
  tenantId: string | null;
  tenantSlug: string | null;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

// Some paths are intentionally public and shouldn't need tenant resolution.
// Healthchecks + the revalidation webhook are server-internal; static assets
// are host-agnostic. /preview/* is host-agnostic too: the tenant comes from
// the HMAC token in the query string, not the Host header, so the admin can
// embed the preview iframe at any reachable tenant-site URL (in dev that's
// usually localhost). The preview page handler validates the token itself.
//
// /api/public/* are server-side proxy route handlers (checkout, cart-pings)
// that forward to the backend API. They derive the customer host themselves
// from `headers().get("host")` and pass it through, so they don't need the
// middleware to resolve the tenant — and worse, they MUST NOT be 404'd by
// the resolver before they get a chance to run, which is exactly what was
// happening in production: the proxy was correct, the middleware was eating
// the request first. Bypassing /api/public/* fixes the checkout end-to-end.
const BYPASS_PATHS = [
  "/healthz",
  "/api/revalidate",
  "/api/public/",
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/preview/",
];

async function resolveHost(host: string): Promise<CacheEntry> {
  const cached = cache.get(host);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const api = process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";
  const token = process.env.INTERNAL_API_TOKEN ?? "";

  let entry: CacheEntry;
  try {
    const res = await fetch(
      `${api}/internal/resolve-host?host=${encodeURIComponent(host)}`,
      {
        headers: {
          "x-internal-token": token,
        },
        // Short timeout — if the API is slow, 404ing is better than
        // holding the request open.
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      },
    );

    if (res.ok) {
      const body = (await res.json()) as {
        resolved: true;
        tenantId: string;
        tenantSlug: string;
        isPublished: boolean;
      };
      entry = {
        resolved: body.isPublished === true,
        tenantId: body.tenantId,
        tenantSlug: body.tenantSlug,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
    } else {
      entry = {
        resolved: false,
        tenantId: null,
        tenantSlug: null,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
    }
  } catch {
    // Network/timeout failure — negative-cache for a short window so we
    // don't repeat the slow path on every request.
    entry = {
      resolved: false,
      tenantId: null,
      tenantSlug: null,
      expiresAt: Date.now() + CACHE_TTL_MS / 2,
    };
  }

  cache.set(host, entry);
  return entry;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (BYPASS_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hostHeader = req.headers.get("host") ?? "";
  // Strip :port if present — we want just the hostname.
  const host = (hostHeader.split(":")[0] ?? "").toLowerCase();

  if (!host) {
    return new NextResponse("Missing Host header", { status: 400 });
  }

  const resolved = await resolveHost(host);

  if (!resolved.resolved || !resolved.tenantId) {
    // 404 before any page handler runs.
    return new NextResponse(null, { status: 404 });
  }

  // Forward resolved tenant context to server components via headers.
  const headers = new Headers(req.headers);
  headers.set("x-tenant-id", resolved.tenantId);
  if (resolved.tenantSlug) headers.set("x-tenant-slug", resolved.tenantSlug);
  headers.set("x-host", host);

  return NextResponse.next({ request: { headers } });
}

// Keep the matcher generous so every page/route sees tenant context.
export const config = {
  matcher: [
    // Match everything EXCEPT Next internals and static files
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};

// Test seam — used by unit tests to flush the cache between cases.
export function __clearHostCache() {
  cache.clear();
}
