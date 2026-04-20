/**
 * Shared "is this tenant's website published?" guard.
 *
 * Every public storefront endpoint (`/public/site`, `/public/products`,
 * `/public/site-layouts/*`, `/public/nav-menus/*`, ...) asserts that the
 * tenant has a SiteConfig with `websiteEnabled=true` AND `isPublished=true`
 * before returning any data.
 *
 * The underlying `sitesRepo.findConfig` call is memoized on the per-request
 * tenant context, so a single cold SSR pass that used to do 5-7 identical
 * SiteConfig reads now does one — no caller changes needed beyond importing
 * this guard.
 *
 * Throws an AppError with statusCode 404 when the site is not published,
 * not enabled, or missing.
 */

import sitesRepo, {
  type SiteConfigWithTemplate,
} from "@/modules/sites/sites.repository";
import { createError } from "@/middlewares/errorHandler";

export async function ensurePublishedSite(
  tenantId: string,
): Promise<SiteConfigWithTemplate> {
  const config = await sitesRepo.findConfig(tenantId);
  if (!config || !config.websiteEnabled || !config.isPublished) {
    throw createError("Site not found", 404);
  }
  return config;
}
