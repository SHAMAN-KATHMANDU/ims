/**
 * Revalidation helper for nav-menus. Fires both `tenant:<id>:site` (header
 * is rendered on every route) and a slot-specific tag so future partial
 * revalidations can be fine-grained.
 */

import { env } from "@/config/env";
import { logger } from "@/config/logger";

export async function revalidateNavMenu(
  tenantId: string,
  slot: string,
): Promise<void> {
  const baseUrl = env.tenantSiteInternalUrl;
  const secret = env.revalidateSecret;
  if (!baseUrl || !secret) return;

  const tags = [`tenant:${tenantId}:site`, `tenant:${tenantId}:nav:${slot}`];

  try {
    const res = await fetch(`${baseUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(2000),
    });

    if (!res.ok) {
      logger.warn("tenant-site nav-menus revalidation failed", undefined, {
        tenantId,
        status: res.status,
        tags,
      });
    }
  } catch (err) {
    logger.warn("tenant-site nav-menus revalidation threw", undefined, {
      tenantId,
      err: err instanceof Error ? err.message : String(err),
      tags,
    });
  }
}
