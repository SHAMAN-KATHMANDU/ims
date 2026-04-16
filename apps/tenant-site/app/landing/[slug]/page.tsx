/**
 * Landing page route — renders a TenantPage marked as isLandingPage=true
 * WITHOUT the site header/footer chrome. Ideal for campaign pages,
 * product launches, and ad destinations where the tenant wants a
 * focused, distraction-free experience.
 *
 * Block-first: if a SiteLayout{scope:"page",pageId} exists, renders via
 * BlockRenderer. Otherwise falls through to the markdown body.
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, getTenantPageBySlug, getSiteLayout } from "@/lib/api";
import { getTenantContext } from "@/lib/tenant";
import { MarkdownBody } from "@/components/blog/MarkdownBody";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import type { BlockDataContext } from "@/components/blocks/data-context";
import type { BlockNode } from "@repo/shared";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const ctx = await getTenantContext();
    const page = await getTenantPageBySlug(ctx.host, ctx.tenantId, slug);
    if (!page) return { title: "Not found" };
    return {
      title: page.seoTitle || page.title,
      description: page.seoDescription || undefined,
    };
  } catch {
    return { title: "Landing" };
  }
}

export default async function LandingPage({ params }: Props) {
  const { slug } = await params;
  const ctx = await getTenantContext();
  const [site, page] = await Promise.all([
    getSite(ctx.host, ctx.tenantId),
    getTenantPageBySlug(ctx.host, ctx.tenantId, slug),
  ]);

  if (!site || !page) notFound();

  // Check if this page has a block layout
  const layout = await getSiteLayout(ctx.host, ctx.tenantId, "page", page.id);

  const dataContext: BlockDataContext = {
    site,
    host: ctx.host,
    tenantId: ctx.tenantId,
    categories: [],
    navPages: [],
    products: [],
    featuredBlogPosts: [],
  };

  // No header/footer — that's the point of a landing page
  return (
    <main>
      {layout && Array.isArray(layout.blocks) && layout.blocks.length > 0 ? (
        <div
          style={{
            maxWidth: "var(--container-width, 1200px)",
            margin: "0 auto",
            padding: "0 1rem",
          }}
        >
          <BlockRenderer
            nodes={layout.blocks as BlockNode[]}
            dataContext={dataContext}
          />
        </div>
      ) : (
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            padding: "var(--section-padding) 1.5rem",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontFamily: "var(--font-display)",
              lineHeight: 1.15,
              marginBottom: "2rem",
            }}
          >
            {page.title}
          </h1>
          <MarkdownBody source={page.bodyMarkdown} />
        </div>
      )}
    </main>
  );
}
