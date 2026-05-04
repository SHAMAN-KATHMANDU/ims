/**
 * Tenant-site middleware — runs on every request before page handlers.
 *
 * 1. Reads the incoming Host header.
 * 2. Calls /api/v1/internal/resolve-host to map host to tenant (cached 60s).
 * 3. If host doesn't resolve, returns 404 early.
 * 4. Checks redirect rules for the pathname (cached 60s, max 5 hops, loop detection).
 * 5. On redirect match, returns 301/302.
 * 6. Attaches x-tenant-id / x-tenant-slug / x-host headers for page handlers.
 */

import { NextResponse, type NextRequest } from "next/server";

const CACHE_TTL_MS = 60_000;
const REDIRECT_CACHE_TTL_MS = 60_000;
const MAX_REDIRECT_HOPS = 5;

type CacheEntry = {
  resolved: boolean;
  tenantId: string | null;
  tenantSlug: string | null;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

type RedirectRule = {
  fromPath: string;
  toPath: string;
  statusCode: number;
};

type RedirectCacheEntry = {
  rules: RedirectRule[];
  expiresAt: number;
};

const redirectCache = new Map<string, RedirectCacheEntry>();

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

/**
 * Hostname used by the site-editor preview iframe (TENANT_SITE_PUBLIC_URL on
 * the API side). Only `/preview/*` resolves on this host — other paths
 * (sub-page links rendered inside the iframe, browser prefetches) get 204
 * No Content so the editor's network panel stays clean instead of flooding
 * with 404s for /products, /contact, /blog, etc.
 */
const PLATFORM_PREVIEW_HOST = (() => {
  const raw =
    process.env.TENANT_SITE_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_TENANT_SITE_PUBLIC_URL ??
    "";
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
})();

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
        headers: { "x-internal-token": token },
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

async function resolveRedirects(tenantId: string): Promise<RedirectRule[]> {
  const cached = redirectCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.rules;
  }

  const api = process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";
  const token = process.env.INTERNAL_API_TOKEN ?? "";

  try {
    const res = await fetch(
      `${api}/internal/redirects?tenantId=${encodeURIComponent(tenantId)}`,
      {
        headers: { "x-internal-token": token },
        signal: AbortSignal.timeout(2000),
        cache: "no-store",
      },
    );

    if (!res.ok) {
      redirectCache.set(tenantId, {
        rules: [],
        expiresAt: Date.now() + REDIRECT_CACHE_TTL_MS,
      });
      return [];
    }

    const body = (await res.json()) as { rules: RedirectRule[] };
    const rules = Array.isArray(body.rules) ? body.rules : [];
    redirectCache.set(tenantId, {
      rules,
      expiresAt: Date.now() + REDIRECT_CACHE_TTL_MS,
    });
    return rules;
  } catch {
    return [];
  }
}

function resolveRedirectChain(
  ruleMap: Map<string, RedirectRule>,
  pathname: string,
): { toPath: string; statusCode: number } | null {
  const first = ruleMap.get(pathname);
  if (!first) return null;

  const visited = new Set<string>([pathname]);
  let current: RedirectRule = first;
  let hops = 0;

  while (hops < MAX_REDIRECT_HOPS) {
    const next = ruleMap.get(current.toPath);
    if (!next) {
      return { toPath: current.toPath, statusCode: current.statusCode };
    }
    if (visited.has(next.toPath)) {
      console.warn(
        `[tenant-site] Redirect loop detected at ${pathname} → … → ${next.toPath}. Skipping.`,
      );
      return null;
    }
    visited.add(current.toPath);
    current = next;
    hops++;
  }

  console.warn(
    `[tenant-site] Redirect chain from ${pathname} exceeds ${MAX_REDIRECT_HOPS} hops. Skipping.`,
  );
  return null;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (BYPASS_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hostHeader = req.headers.get("host") ?? "";
  const host = (hostHeader.split(":")[0] ?? "").toLowerCase();

  if (!host) {
    return new NextResponse("Missing Host header", { status: 400 });
  }

  if (PLATFORM_PREVIEW_HOST && host === PLATFORM_PREVIEW_HOST) {
    return new NextResponse(null, { status: 204 });
  }

  const resolved = await resolveHost(host);

  if (!resolved.resolved || !resolved.tenantId) {
    return new NextResponse(null, { status: 404 });
  }

  // Check redirect rules before forwarding to page handlers.
  const rules = await resolveRedirects(resolved.tenantId);
  if (rules.length > 0) {
    const ruleMap = new Map<string, RedirectRule>(
      rules.map((r) => [r.fromPath, r]),
    );
    const match = resolveRedirectChain(ruleMap, pathname);
    if (match) {
      const destination = new URL(match.toPath, req.url);
      return NextResponse.redirect(destination, match.statusCode);
    }
  }

  const headers = new Headers(req.headers);
  headers.set("x-tenant-id", resolved.tenantId);
  if (resolved.tenantSlug) headers.set("x-tenant-slug", resolved.tenantSlug);
  headers.set("x-host", host);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};

export function __clearHostCache() {
  cache.clear();
}

export function __clearRedirectCache() {
  redirectCache.clear();
}
