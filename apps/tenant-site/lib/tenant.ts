/**
 * Server-side helper to read the tenant context injected by middleware.ts.
 *
 * The middleware sets `x-tenant-id` and `x-host` on the response headers;
 * Next.js 15 surfaces those via `headers()` to server components so every
 * page/route can read them without prop-drilling.
 */

import { headers } from "next/headers";

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  host: string;
}

export async function getTenantContext(): Promise<TenantContext> {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  const tenantSlug = h.get("x-tenant-slug") ?? "";
  const host = h.get("x-host") ?? h.get("host") ?? "";

  if (!tenantId || !host) {
    // This should be unreachable — middleware 404s unknown hosts before the
    // request lands in a page handler. But throwing here makes the failure
    // loud if something upstream misbehaves.
    throw new Error(
      "Missing tenant context headers — was the request routed through middleware.ts?",
    );
  }

  return { tenantId, tenantSlug, host };
}
