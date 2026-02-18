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
  return tenantStorage.run({ tenantId, bypassScoping }, fn);
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
