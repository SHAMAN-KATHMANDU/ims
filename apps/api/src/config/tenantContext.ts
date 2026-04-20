/**
 * Tenant Context — AsyncLocalStorage for request-scoped tenant isolation.
 *
 * Provides tenant context throughout the request lifecycle without passing
 * tenantId through every function signature. Used by Prisma extensions
 * to auto-inject tenantId into queries.
 *
 * Usage:
 *   - Set context in tenant middleware: runWithTenant(tenantId, next)
 *   - Read context anywhere: getTenantId()
 */

import { AsyncLocalStorage } from "async_hooks";

interface TenantContext {
  tenantId: string;
  /** When true, skip auto-scoping (for platform admin cross-tenant operations) */
  bypassScoping: boolean;
  /**
   * Request-scoped memo cache. Populated lazily by callers that want to
   * deduplicate repeated lookups within a single request (e.g. the
   * public-site `ensurePublished` guard, which otherwise fires 5-7
   * identical SiteConfig reads on a cold homepage SSR). The map is
   * allocated once per `runWithTenant` call, so cache entries do NOT
   * leak across requests.
   */
  memo: Map<string, unknown>;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Run a function within a tenant context.
 * All Prisma queries inside the callback will be auto-scoped to this tenant.
 */
export function runWithTenant<T>(
  tenantId: string,
  fn: () => T,
  bypassScoping = false,
): T {
  return tenantStorage.run({ tenantId, bypassScoping, memo: new Map() }, fn);
}

/**
 * Return the request-scoped memo map, or null when no tenant context is
 * active (e.g. tests, scripts). Callers using this to cache a Promise
 * should fall back to running the work uncached when this returns null.
 */
export function getRequestMemo(): Map<string, unknown> | null {
  return tenantStorage.getStore()?.memo ?? null;
}

/**
 * Get the current tenant ID from the async context.
 * Returns null if no tenant context is active (e.g., during startup, seeding, platform admin).
 */
export function getTenantId(): string | null {
  const ctx = tenantStorage.getStore();
  if (!ctx || ctx.bypassScoping) return null;
  return ctx.tenantId;
}

/**
 * Get the full tenant context (including bypass flag).
 */
export function getTenantContext(): TenantContext | null {
  return tenantStorage.getStore() ?? null;
}
