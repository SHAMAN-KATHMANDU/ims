import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getSite,
  getCategories,
  getNavPages,
  getTenantPageBySlug,
} from "@/lib/api";
import { getTenantContext } from "@/lib/tenant";
import { SiteHeader, SiteFooter } from "@/components/templates/shared";
import { MarkdownBody } from "@/components/blog/MarkdownBody";

/**
 * Catch-all route for tenant-authored custom pages (About, FAQ,
 * Shipping, Lookbook, ...). The slug is claimed by a TenantPage row on
 * the tenant; unknown slugs 404. Reserved slugs (products / blog /
 * contact / api / _next / healthz / sitemap / robots) are caught by
 * the editor's reserved-slug guard and can't be created, so we don't
 * need a route-level denylist here.
 *
 * Layout variants (`default` / `full-width` / `narrow`) map to three
 * content-column widths so the tenant can pick a reading width per
 * page without touching CSS.
 */

type Props = {
  params: Promise<{ slug: string }>;
};

function columnWidth(variant: string | undefined): number {
  if (variant === "full-width") return 1200;
  if (variant === "narrow") return 640;
  return 820;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
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
  const { slug } = await params;
  const ctx = await getTenantContext();
  const [site, page, categories, navPages] = await Promise.all([
    getSite(ctx.host, ctx.tenantId),
    getTenantPageBySlug(ctx.host, ctx.tenantId, slug),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
  ]);

  if (!site || !page) notFound();

  const maxWidth = columnWidth(page.layoutVariant);

  return (
    <div data-page="tenant-custom">
      <SiteHeader
        site={site}
        host={ctx.host}
        categories={categories}
        navPages={navPages}
      />
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
            }}
          >
            {page.title}
          </h1>
          <MarkdownBody source={page.bodyMarkdown} />
        </article>
      </main>
      <SiteFooter site={site} host={ctx.host} navPages={navPages} />
    </div>
  );
}
