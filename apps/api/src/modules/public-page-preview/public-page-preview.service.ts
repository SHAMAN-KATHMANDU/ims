/**
 * Public draft-page preview service.
 *
 * Unauthenticated. Tenant context comes from the HMAC-signed token, not from
 * the Host header — this lets the admin embed the iframe at any tenant-site
 * URL the browser can reach (in dev: localhost:3001 with TENANT_SITE_PUBLIC_URL).
 *
 * Returns:
 *   - the draft TenantPage (regardless of isPublished)
 *   - the tenant's site branding so the preview iframe can render with the
 *     correct theme tokens
 *
 * The preview deliberately does NOT include nav/categories/footer data — the
 * tenant-site preview route renders a minimal "PREVIEW" wrapper around just
 * the page body. Adding full chrome is a future iteration.
 */

import { basePrisma } from "@/config/prisma";
import { createError } from "@/middlewares/errorHandler";
import { verifyPreviewToken } from "@/modules/site-preview/preview-token";

export interface DraftPagePreview {
  page: {
    id: string;
    slug: string;
    title: string;
    bodyMarkdown: string;
    layoutVariant: string;
    seoTitle: string | null;
    seoDescription: string | null;
    isPublished: boolean;
    updatedAt: string;
  };
  branding: unknown;
}

export class PublicPagePreviewService {
  async getDraftPreview(
    pageId: string,
    token: string,
  ): Promise<DraftPagePreview> {
    const payload = verifyPreviewToken(token);
    if (!payload) throw createError("Invalid or expired preview token", 401);
    if (payload.pageId !== pageId) {
      throw createError("Token does not match this page", 401);
    }

    const page = await basePrisma.tenantPage.findFirst({
      where: { id: pageId, tenantId: payload.tenantId },
    });
    if (!page) throw createError("Page not found", 404);

    const siteConfig = await basePrisma.siteConfig.findUnique({
      where: { tenantId: payload.tenantId },
      select: { branding: true },
    });

    return {
      page: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        bodyMarkdown: page.bodyMarkdown,
        layoutVariant: page.layoutVariant,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        isPublished: page.isPublished,
        updatedAt: page.updatedAt.toISOString(),
      },
      branding: siteConfig?.branding ?? null,
    };
  }
}

export default new PublicPagePreviewService();
