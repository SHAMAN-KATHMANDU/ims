import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenantContext } from "@/lib/tenant";
import { getBlogPostBySlug } from "@/lib/api";
import { BlogPageShell } from "@/components/blog/BlogPageShell";
import { BlogArticle } from "@/components/blog/BlogArticle";

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
  const result = await getBlogPostBySlug(ctx.host, ctx.tenantId, slug);
  if (!result) notFound();

  return (
    <BlogPageShell>
      <BlogArticle post={result.post} related={result.related} />
    </BlogPageShell>
  );
}
