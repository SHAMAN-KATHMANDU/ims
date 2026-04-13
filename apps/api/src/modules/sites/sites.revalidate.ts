/**
 * Revalidation helper — after a tenant-scoped mutation on SiteConfig
 * (publish, update, pickTemplate), POST to the tenant-site renderer's
 * /api/revalidate endpoint so cached pages for this tenant get flushed.
 *
 * Failures here are non-fatal: the DB write has already committed, and the
 * cache will self-heal on the next `next.revalidate` window (default 5
 * minutes). We log and move on.
 */

import { env } from "@/config/env";
import { logger } from "@/config/logger";

function tagsForTenant(tenantId: string): string[] {
  return [
    `tenant:${tenantId}:site`,
    `tenant:${tenantId}:products`,
    `tenant:${tenantId}:categories`,
  ];
}

/**
 * Fire-and-forget revalidation. Returns a promise you can await if you
 * want strict ordering, but the caller is free to drop it.
 */
export async function revalidateTenantSite(tenantId: string): Promise<void> {
  const baseUrl = env.tenantSiteInternalUrl;
  const secret = env.revalidateSecret;

  if (!baseUrl || !secret) {
    // Feature not wired up for this deployment — that's fine during the
    // soak phase before the tenant-site container is rolled out.
    return;
  }

  const tags = tagsForTenant(tenantId);

  try {
    const res = await fetch(`${baseUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ tags }),
      // Abort quickly if the renderer is slow — we don't want user-facing
      // write paths held up by a background cache flush.
      signal: AbortSignal.timeout(2000),
    });

    if (!res.ok) {
      logger.warn("tenant-site revalidation failed", undefined, {
        tenantId,
        status: res.status,
        tags,
      });
    }
  } catch (err) {
    logger.warn("tenant-site revalidation threw", undefined, {
      tenantId,
      err: err instanceof Error ? err.message : String(err),
      tags,
    });
  }
}
