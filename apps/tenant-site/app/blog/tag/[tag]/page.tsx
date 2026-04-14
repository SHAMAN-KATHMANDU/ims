import { getTenantContext } from "@/lib/tenant";
import { getBlogPosts, getBlogCategories } from "@/lib/api";
import { BlogPageShell } from "@/components/blog/BlogPageShell";
import { BlogList } from "@/components/blog/BlogList";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function BlogTagPage({ params, searchParams }: Props) {
  const { tag } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const limit = 12;

  const decodedTag = decodeURIComponent(tag);
  const ctx = await getTenantContext();
  const [list, categories] = await Promise.all([
    getBlogPosts(ctx.host, ctx.tenantId, { page, limit, tag: decodedTag }),
    getBlogCategories(ctx.host, ctx.tenantId),
  ]);

  return (
    <BlogPageShell>
      <h1 style={{ fontSize: "2.25rem", marginBottom: "0.5rem" }}>
        #{decodedTag}
      </h1>
      <p
        style={{
          color: "rgba(0,0,0,0.6)",
          marginBottom: "2.5rem",
        }}
      >
        Posts tagged with {decodedTag}.
      </p>
      <BlogList
        posts={list.posts}
        categories={categories}
        total={list.total}
        page={list.page}
        limit={list.limit}
        basePath={`/blog/tag/${encodeURIComponent(decodedTag)}`}
      />
    </BlogPageShell>
  );
}
