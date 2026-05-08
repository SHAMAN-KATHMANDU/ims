import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getSiteWithProfile,
  getCategories,
  getNavPages,
  getTenantPageBySlug,
  getSiteLayout,
} from "@/lib/api";
import { getTenantContext } from "@/lib/tenant";
import { MarkdownBody } from "@/components/blog/MarkdownBody";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import type { BlockNode } from "@repo/shared";

/**
 * Catch-all route for tenant-authored custom pages (About, FAQ,
 * Shipping, Lookbook, ...). Supports nested URLs via the page
 * hierarchy: /about renders slug="about", /about/team renders
 * slug="team" (the last segment is always the page slug; earlier
 * segments are validated as ancestors but the page is looked up by
 * the leaf slug alone — flat slugs are still unique per tenant).
 *
 * Layout variants (`default` / `full-width` / `narrow`) map to three
 * content-column widths so the tenant can pick a reading width per
 * page without touching CSS.
 */

type Props = {
  params: Promise<{ slug: string[] }>;
};

function columnWidth(variant: string | undefined): number {
  if (variant === "full-width") return 1200;
  if (variant === "narrow") return 640;
  return 820;
}

function leafSlug(segments: string[]): string {
  return segments[segments.length - 1] ?? "";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = leafSlug((await params).slug);
  try {
    const ctx = await getTenantContext();
    const page = await getTenantPageBySlug(ctx.host, ctx.tenantId, slug);
    if (!page) return { title: "Page not found" };
    return {
      title: page.seoTitle || page.title,
      description: page.seoDescription || undefined,
    };
  } catch {
    return { title: "Page" };
  }
}

export default async function TenantCustomPage({ params }: Props) {
  const slug = leafSlug((await params).slug);
  if (!slug) notFound();

  const ctx = await getTenantContext();
  const [site, page, categories, navPages] = await Promise.all([
    getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug),
    getTenantPageBySlug(ctx.host, ctx.tenantId, slug),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
  ]);

  if (!site || !page) notFound();

  // Phase 4: if a SiteLayout row exists for this page, render its block tree
  // instead of the flat markdown body. When no layout row exists (the default
  // for every existing tenant) we keep the legacy markdown path unchanged.
  const layout = await getSiteLayout(ctx.host, ctx.tenantId, "page", page.id);

  const maxWidth = columnWidth(page.layoutVariant);

  // Build a minimal data context for any blocks in a tenant custom page.
  // Custom pages rarely use commerce blocks, so we keep product/blog
  // fetches off the hot path — blocks that need them read empty arrays.
  const dataContext = {
    site,
    host: ctx.host,
    tenantId: ctx.tenantId,
    categories,
    navPages,
    products: [],
    featuredBlogPosts: [],
  };

  return (
    <div data-page="tenant-custom">
      {/* Phase 8 — full-bleed cover spans the viewport above the page chrome. */}
      {page.coverImageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={page.coverImageUrl}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          sizes="100vw"
          style={{
            width: "100%",
            aspectRatio: "16 / 5",
            objectFit: "cover",
            display: "block",
          }}
        />
      )}
      <main
        className="container"
        style={{
          padding: "var(--section-padding) 0",
          maxWidth,
          margin: "0 auto",
        }}
      >
        <article>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontFamily: "var(--font-display)",
              lineHeight: 1.15,
              marginBottom: "2rem",
              color: "var(--color-text)",
              display: "flex",
              alignItems: "baseline",
              gap: "0.65rem",
            }}
          >
            {page.icon && (
              <span
                aria-hidden="true"
                style={{
                  fontSize: "2rem",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                {page.icon}
              </span>
            )}
            <span>{page.title}</span>
          </h1>
          {layout &&
          Array.isArray(layout.blocks) &&
          layout.blocks.length > 0 ? (
            <BlockRenderer
              nodes={layout.blocks as BlockNode[]}
              dataContext={dataContext}
            />
          ) : (
            <MarkdownBody source={page.bodyMarkdown} />
          )}
        </article>
      </main>
    </div>
  );
}
