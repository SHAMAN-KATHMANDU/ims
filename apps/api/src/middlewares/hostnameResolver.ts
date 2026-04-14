/**
 * Hostname Resolver Middleware
 *
 * Resolves the tenant from `req.hostname` via the TenantDomain table and
 * attaches both the tenant and the resolved app type to the request. Used
 * by the public API surface (no JWT) and by any route that needs to know
 * which app (WEBSITE / IMS / API) the request was addressed to.
 *
 * Pairs with `resolveTenant` (JWT-based) but runs independently — this
 * middleware sets up the AsyncLocalStorage tenant context so Prisma queries
 * downstream are auto-scoped.
 */

import { Request, Response, NextFunction } from "express";
import type { Tenant, TenantDomainApp } from "@prisma/client";
import { basePrisma } from "@/config/prisma";
import { runWithTenant } from "@/config/tenantContext";
import { sendControllerError } from "@/utils/controllerError";

type ResolvedHost = {
  tenant: Tenant;
  appType: TenantDomainApp;
  hostname: string;
};

const CACHE_TTL_MS = 60_000;
const hostCache = new Map<
  string,
  { value: ResolvedHost | null; expiresAt: number }
>();

/** Test / ops helper — flush cached lookups. */
export function clearHostnameCache(): void {
  hostCache.clear();
}

async function lookupHostname(hostname: string): Promise<ResolvedHost | null> {
  const cached = hostCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const domain = await basePrisma.tenantDomain.findUnique({
    where: { hostname },
    include: { tenant: true },
  });

  const value: ResolvedHost | null =
    domain && domain.tenant
      ? { tenant: domain.tenant, appType: domain.appType, hostname }
      : null;

  hostCache.set(hostname, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

type Options = {
  /** If true, returns 404 when hostname isn't registered. Default: true. */
  required?: boolean;
};

/**
 * Resolve tenant by `req.hostname`. On success:
 *  - attaches `req.tenant` and `req.appType`
 *  - runs downstream within tenant AsyncLocalStorage context
 *
 * If `required` is false, requests with unknown hostnames pass through
 * unchanged (useful for routes that accept either a hostname or a JWT).
 */
/**
 * Resolve the request's effective hostname.
 *
 * Order of precedence:
 *  1. X-Forwarded-Host header (set explicitly by trusted proxies and by
 *     server-to-server callers like the tenant-site renderer — Node's
 *     undici fetch strips the `Host` header because it's a "forbidden
 *     header name" per the Fetch spec, so internal callers need another
 *     way to signal the customer-facing hostname)
 *  2. req.hostname (derived by Express from the TCP-level Host header)
 *
 * Only the first comma-separated value is used if multiple upstream proxies
 * have appended to X-Forwarded-Host.
 */
function resolveRequestHostname(req: Request): string {
  const raw = req.headers?.["x-forwarded-host"];
  const forwarded = Array.isArray(raw) ? raw[0] : raw;
  if (typeof forwarded === "string" && forwarded.length > 0) {
    // Take the first entry if the header is comma-separated (chain of proxies)
    // and strip any port suffix.
    const first = forwarded.split(",")[0]?.trim() ?? "";
    const withoutPort = first.split(":")[0] ?? "";
    if (withoutPort) return withoutPort.toLowerCase();
  }
  return (req.hostname || "").toLowerCase();
}

export function resolveTenantFromHostname(options: Options = {}) {
  const required = options.required ?? true;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hostname = resolveRequestHostname(req);
      if (!hostname) {
        if (required) {
          return res
            .status(400)
            .json({ message: "Missing Host header", error: "host_required" });
        }
        return next();
      }

      const resolved = await lookupHostname(hostname);

      if (!resolved) {
        if (required) {
          return res.status(404).json({
            message: `Unknown host ${hostname}`,
            error: "host_not_registered",
          });
        }
        return next();
      }

      if (!resolved.tenant.isActive) {
        return res.status(403).json({
          message: "This site is currently unavailable. Contact support.",
          error: "tenant_inactive",
        });
      }

      req.tenant = resolved.tenant;
      req.appType = resolved.appType;

      return runWithTenant(resolved.tenant.id, () => next());
    } catch (error) {
      return sendControllerError(req, res, error, "Hostname resolution error");
    }
  };
}

export default resolveTenantFromHostname;
