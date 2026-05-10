import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenantContext } from "@/lib/tenant";
import {
  getBlogPostBySlug,
  getSiteWithProfile,
  getCategories,
  getNavPages,
  getSiteLayout,
} from "@/lib/api";
import { BlogPageShell } from "@/components/blog/BlogPageShell";
import { BlogArticle } from "@/components/blog/BlogArticle";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import type { BlockDataContext } from "@/components/blocks/data-context";
import { buildAssetMap } from "@/components/blocks/build-asset-map";
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

  const [
    result,
    site,
    categories,
    navPages,
    headerLayout,
    pageLayout,
    footerLayout,
  ] = await Promise.all([
    getBlogPostBySlug(ctx.host, ctx.tenantId, slug),
    getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
    getSiteLayout(ctx.host, ctx.tenantId, "header").catch(() => null),
    getSiteLayout(ctx.host, ctx.tenantId, "blog-post").catch(() => null),
    getSiteLayout(ctx.host, ctx.tenantId, "footer").catch(() => null),
  ]);

  if (!result) notFound();

  if (
    site &&
    pageLayout &&
    Array.isArray(pageLayout.blocks) &&
    pageLayout.blocks.length > 0
  ) {
    const blocks = [
      ...(Array.isArray(headerLayout?.blocks)
        ? (headerLayout.blocks as BlockNode[])
        : []),
      ...(Array.isArray(pageLayout.blocks)
        ? (pageLayout.blocks as BlockNode[])
        : []),
      ...(Array.isArray(footerLayout?.blocks)
        ? (footerLayout.blocks as BlockNode[])
        : []),
    ];

    const assets = await buildAssetMap(ctx.host, ctx.tenantId, blocks);

    const dataContext: BlockDataContext = {
      site,
      host: ctx.host,
      tenantId: ctx.tenantId,
      categories,
      navPages,
      products: [],
      featuredBlogPosts: result.related ?? [],
      assets,
    };
    return (
      <>
        <main>
          <BlockRenderer nodes={blocks} dataContext={dataContext} />
        </main>
      </>
    );
  }

  // Phase 8 — render the cover at the route level so the shell can place
  // it outside `.container` and let it span the full viewport. The shell
  // accepts an optional `cover` slot for exactly this case.
  const cover = result.post.coverImageUrl ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={result.post.coverImageUrl}
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
  ) : null;
  return (
    <BlogPageShell cover={cover}>
      <BlogArticle post={result.post} related={result.related} />
    </BlogPageShell>
  );
}
