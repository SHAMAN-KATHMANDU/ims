import { MetadataRoute } from "next";
import { getTenantContext } from "@/lib/tenant";
import {
  getBlogPosts,
  getBlogCategories,
  getProducts,
  getNavPages,
} from "@/lib/api";

// Tenant-specific sitemap. Static top-level pages, plus every published
// product, blog post, blog category, and tenant custom page. Each section
// is best-effort — a failure in one doesn't drop the others.
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

    // Products — paginate until exhausted. API caps limit at 100.
    try {
      let page = 1;
      const limit = 100;
      while (true) {
        const list = await getProducts(ctx.host, ctx.tenantId, {
          page,
          limit,
        });
        if (!list) break;
        for (const p of list.products) {
          entries.push({
            url: `${base}/products/${p.id}`,
            changeFrequency: "weekly",
            priority: 0.7,
          });
        }
        if (page * limit >= list.total || list.products.length === 0) break;
        page += 1;
        if (page > 50) break; // safety cap
      }
    } catch {
      // swallow
    }

    // Tenant custom pages (About, FAQ, Shipping, ...).
    try {
      const pages = await getNavPages(ctx.host, ctx.tenantId);
      for (const p of pages) {
        entries.push({
          url: `${base}/${p.slug}`,
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    } catch {
      // swallow
    }

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
