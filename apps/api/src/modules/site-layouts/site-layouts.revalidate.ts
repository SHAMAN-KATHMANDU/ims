/**
 * Revalidation helper for site-layouts.
 *
 * Fires to the tenant-site renderer's /api/revalidate with tags:
 *   - tenant:<id>:site              — header/footer/global shell
 *   - tenant:<id>:layout:<scope>    — one specific scope (home, products-index, ...)
 *
 * The renderer tags its fetch calls with these same strings in
 * apps/tenant-site/lib/api.ts (getSiteLayout, added in Phase 1).
 */

import { env } from "@/config/env";
import { logger } from "@/config/logger";

export async function revalidateSiteLayout(
  tenantId: string,
  scope: string,
): Promise<void> {
  const baseUrl = env.tenantSiteInternalUrl;
  const secret = env.revalidateSecret;
  if (!baseUrl || !secret) return;

  const tags = [
    `tenant:${tenantId}:site`,
    `tenant:${tenantId}:layout:${scope}`,
  ];

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
      logger.warn("tenant-site site-layouts revalidation failed", undefined, {
        tenantId,
        status: res.status,
        tags,
      });
    }
  } catch (err) {
    logger.warn("tenant-site site-layouts revalidation threw", undefined, {
      tenantId,
      err: err instanceof Error ? err.message : String(err),
      tags,
    });
  }
}
