import { MetadataRoute } from "next";
import { getTenantContext } from "@/lib/tenant";
import { getBlogPosts, getBlogCategories } from "@/lib/api";

// Tenant-specific sitemap. Static top-level pages, plus every published blog
// post and blog category. Product-level entries can be added later once we
// decide on a URL strategy.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const ctx = await getTenantContext();
    const base = `https://${ctx.host}`;

    const entries: MetadataRoute.Sitemap = [
      { url: `${base}/`, changeFrequency: "daily", priority: 1 },
      { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
      { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
      { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.8 },
    ];

    // Blog posts + categories. Failures here don't block the core sitemap —
    // we treat /blog as best-effort for SEO.
    try {
      // Page size cap (50) from ListPublicPostsQuerySchema; loop until we
      // have everything. Most tenants will have <50 posts so this is one
      // round-trip in practice.
      let page = 1;
      const limit = 50;
      while (true) {
        const list = await getBlogPosts(ctx.host, ctx.tenantId, {
          page,
          limit,
        });
        for (const post of list.posts) {
          entries.push({
            url: `${base}/blog/${post.slug}`,
            changeFrequency: "monthly",
            priority: 0.6,
            lastModified: post.publishedAt ?? undefined,
          });
        }
        if (page * limit >= list.total || list.posts.length === 0) break;
        page += 1;
        if (page > 20) break; // safety cap
      }

      const categories = await getBlogCategories(ctx.host, ctx.tenantId);
      for (const c of categories) {
        if (c.postCount > 0) {
          entries.push({
            url: `${base}/blog/category/${c.slug}`,
            changeFrequency: "weekly",
            priority: 0.5,
          });
        }
      }
    } catch {
      // swallow — the main entries are already appended
    }

    return entries;
  } catch {
    return [];
  }
}
