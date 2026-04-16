import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenantContext } from "@/lib/tenant";
import {
  getBlogPostBySlug,
  getSite,
  getCategories,
  getNavPages,
  getSiteLayout,
} from "@/lib/api";
import { BlogPageShell } from "@/components/blog/BlogPageShell";
import { BlogArticle } from "@/components/blog/BlogArticle";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { SiteHeader, SiteFooter } from "@/components/templates/shared";
import type { BlockDataContext } from "@/components/blocks/data-context";
import type { BlockNode } from "@repo/shared";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const ctx = await getTenantContext();
    const result = await getBlogPostBySlug(ctx.host, ctx.tenantId, slug);
    if (!result) return { title: "Post not found" };
    const { post } = result;
    return {
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || undefined,
      openGraph: {
        title: post.seoTitle || post.title,
        description: post.seoDescription || post.excerpt || undefined,
        images: post.heroImageUrl ? [post.heroImageUrl] : undefined,
        type: "article",
      },
    };
  } catch {
    return { title: "Post" };
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const ctx = await getTenantContext();

  const [result, site, categories, navPages, layout] = await Promise.all([
    getBlogPostBySlug(ctx.host, ctx.tenantId, slug),
    getSite(ctx.host, ctx.tenantId),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
    getSiteLayout(ctx.host, ctx.tenantId, "blog-post").catch(() => null),
  ]);

  if (!result) notFound();

  if (
    site &&
    layout &&
    Array.isArray(layout.blocks) &&
    layout.blocks.length > 0
  ) {
    const dataContext: BlockDataContext = {
      site,
      host: ctx.host,
      tenantId: ctx.tenantId,
      categories,
      navPages,
      products: [],
      featuredBlogPosts: result.related ?? [],
    };
    return (
      <>
        <SiteHeader
          site={site}
          host={ctx.host}
          categories={categories}
          navPages={navPages}
        />
        <main>
          <BlockRenderer
            nodes={layout.blocks as BlockNode[]}
            dataContext={dataContext}
          />
        </main>
        <SiteFooter site={site} host={ctx.host} navPages={navPages} />
      </>
    );
  }

  return (
    <BlogPageShell>
      <BlogArticle post={result.post} related={result.related} />
    </BlogPageShell>
  );
}
