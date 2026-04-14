import { getTenantContext } from "@/lib/tenant";
import { getBlogPosts, getBlogCategories } from "@/lib/api";
import { BlogPageShell } from "@/components/blog/BlogPageShell";
import { BlogList } from "@/components/blog/BlogList";

export const dynamic = "force-dynamic";

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const ctx = await getTenantContext();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const limit = 12;

  const [list, categories] = await Promise.all([
    getBlogPosts(ctx.host, ctx.tenantId, { page, limit }),
    getBlogCategories(ctx.host, ctx.tenantId),
  ]);

  return (
    <BlogPageShell>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Journal</h1>
      <p
        style={{
          color: "rgba(0,0,0,0.6)",
          marginBottom: "2.5rem",
          fontSize: "1rem",
        }}
      >
        Stories, craft notes, and updates from the team.
      </p>
      <BlogList
        posts={list.posts}
        categories={categories}
        total={list.total}
        page={list.page}
        limit={list.limit}
      />
    </BlogPageShell>
  );
}
