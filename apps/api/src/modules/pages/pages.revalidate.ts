/**
 * Revalidation helper for tenant custom pages.
 *
 * Fires to the tenant-site renderer's /api/revalidate with tags:
 *   - tenant:<id>:pages         — nav list / catch-all listing
 *   - tenant:<id>:page:<slug>   — one particular page
 *   - tenant:<id>:site          — header uses the nav (any page with
 *                                 showInNav mutates the header)
 */

import { env } from "@/config/env";
import { logger } from "@/config/logger";

export type RevalidatePageOpts = {
  slug?: string;
};

function tagsFor(tenantId: string, opts: RevalidatePageOpts): string[] {
  const tags = [`tenant:${tenantId}:pages`, `tenant:${tenantId}:site`];
  if (opts.slug) tags.push(`tenant:${tenantId}:page:${opts.slug}`);
  return tags;
}

export async function revalidatePages(
  tenantId: string,
  opts: RevalidatePageOpts = {},
): Promise<void> {
  const baseUrl = env.tenantSiteInternalUrl;
  const secret = env.revalidateSecret;
  if (!baseUrl || !secret) return;

  const tags = tagsFor(tenantId, opts);
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
      logger.warn("tenant-site pages revalidation failed", undefined, {
        tenantId,
        status: res.status,
        tags,
      });
    }
  } catch (err) {
    logger.warn("tenant-site pages revalidation threw", undefined, {
      tenantId,
      err: err instanceof Error ? err.message : String(err),
      tags,
    });
  }
}
