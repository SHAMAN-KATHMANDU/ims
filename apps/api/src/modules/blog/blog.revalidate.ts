/**
 * Revalidation helper for the blog module.
 *
 * Fires to the tenant-site renderer's /api/revalidate with blog cache tags
 * so the next visit re-fetches. Non-fatal on failure — writes have already
 * committed, cache self-heals on the next ISR window.
 *
 * Tags:
 *   - tenant:<id>:blog         — list/index pages, category/tag pages
 *   - tenant:<id>:blog:<slug>  — single article page (only when slug known)
 *   - tenant:<id>:site         — homepage (featured-blog section)
 */

import { env } from "@/config/env";
import { logger } from "@/config/logger";

export type RevalidateBlogOpts = {
  slug?: string;
};

function tagsFor(tenantId: string, opts: RevalidateBlogOpts): string[] {
  const tags = [`tenant:${tenantId}:blog`, `tenant:${tenantId}:site`];
  if (opts.slug) tags.push(`tenant:${tenantId}:blog:${opts.slug}`);
  return tags;
}

export async function revalidateBlog(
  tenantId: string,
  opts: RevalidateBlogOpts = {},
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
      logger.warn("tenant-site blog revalidation failed", undefined, {
        tenantId,
        status: res.status,
        tags,
      });
    }
  } catch (err) {
    logger.warn("tenant-site blog revalidation threw", undefined, {
      tenantId,
      err: err instanceof Error ? err.message : String(err),
      tags,
    });
  }
}
