/**
 * Generic revalidation helper for tenant-scoped cache tags.
 *
 * The tenant-site renderer caches public read paths under tags like
 * `tenant:<id>:collections`, `tenant:<id>:bundles`, `tenant:<id>:promos`,
 * `tenant:<id>:assets` (see `apps/tenant-site/lib/api.ts` for the
 * canonical tag list). Whenever an admin mutation invalidates one of
 * those resource sets, call this helper with the matching tag set so
 * the storefront serves fresh content immediately rather than waiting
 * for the next 5-minute revalidate window.
 *
 * Pre-built tag families ship below as named functions (`collectionTags`,
 * `bundleTags`, etc.) so callers don't need to remember the exact tag
 * strings. Adding a new resource: define a new tag-family function and
 * add the matching consumer in `apps/tenant-site/lib/api.ts`.
 *
 * Failure mode mirrors `sites.revalidate.ts` — non-fatal, logged.
 */

import { env } from "@/config/env";
import { logger } from "@/config/logger";

export async function revalidateTenantTags(
  tenantId: string,
  tags: string[],
  context?: string,
): Promise<void> {
  if (tags.length === 0) return;
  const baseUrl = env.tenantSiteInternalUrl;
  const secret = env.revalidateSecret;
  if (!baseUrl || !secret) return;

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
      logger.warn(
        `tenant-site revalidation failed${context ? ` (${context})` : ""}`,
        undefined,
        { tenantId, status: res.status, tags },
      );
    }
  } catch (err) {
    logger.warn(
      `tenant-site revalidation threw${context ? ` (${context})` : ""}`,
      undefined,
      {
        tenantId,
        err: err instanceof Error ? err.message : String(err),
        tags,
      },
    );
  }
}

// ── Tag families ────────────────────────────────────────────────────────────
// Each function returns the storefront cache tags affected by a mutation
// on that resource. Mirror `apps/tenant-site/lib/api.ts` tag strings.

export function collectionTags(tenantId: string, slug?: string): string[] {
  const tags = [`tenant:${tenantId}:collections`];
  if (slug) tags.push(`tenant:${tenantId}:collection:${slug}`);
  return tags;
}

export function bundleTags(tenantId: string, slug?: string): string[] {
  const tags = [`tenant:${tenantId}:bundles`];
  if (slug) tags.push(`tenant:${tenantId}:bundle:${slug}`);
  return tags;
}

export function promoTags(tenantId: string): string[] {
  return [`tenant:${tenantId}:promos`];
}

export function assetTags(tenantId: string): string[] {
  return [`tenant:${tenantId}:assets`];
}
