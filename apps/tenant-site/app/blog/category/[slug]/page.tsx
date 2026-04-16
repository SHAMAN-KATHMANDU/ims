import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { getBlogPosts, getBlogCategories } from "@/lib/api";
import { BlogPageShell } from "@/components/blog/BlogPageShell";
import { BlogList } from "@/components/blog/BlogList";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await getTenantContext();
  const categories = await getBlogCategories(ctx.host, ctx.tenantId);
  const category = categories.find((c) => c.slug === slug);
  const name = category?.name ?? slug;
  return {
    title: `${name} — Blog`,
    description:
      category?.description ?? `Browse posts in the ${name} category.`,
    alternates: { canonical: `/blog/category/${slug}` },
  };
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const limit = 12;

  const ctx = await getTenantContext();
  const [list, categories] = await Promise.all([
    getBlogPosts(ctx.host, ctx.tenantId, { page, limit, categorySlug: slug }),
    getBlogCategories(ctx.host, ctx.tenantId),
  ]);

  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  return (
    <BlogPageShell>
      <h1 style={{ fontSize: "2.25rem", marginBottom: "0.5rem" }}>
        {category.name}
      </h1>
      {category.description && (
        <p
          style={{
            color: "var(--color-muted)",
            marginBottom: "2.5rem",
          }}
        >
          {category.description}
        </p>
      )}
      <BlogList
        posts={list.posts}
        categories={categories}
        activeCategorySlug={slug}
        total={list.total}
        page={list.page}
        limit={list.limit}
        basePath={`/blog/category/${slug}`}
      />
    </BlogPageShell>
  );
}
