import { getTenantContext } from "@/lib/tenant";
import {
  getSite,
  getProducts,
  getCategories,
  getFeaturedBlogPosts,
} from "@/lib/api";
import { pickTemplate } from "@/components/templates/pickTemplate";
import { notFound } from "next/navigation";

export default async function HomePage() {
  const ctx = await getTenantContext();
  const [site, productList, categories, featuredBlogPosts] = await Promise.all([
    getSite(ctx.host, ctx.tenantId),
    getProducts(ctx.host, ctx.tenantId, { page: 1, limit: 12 }),
    getCategories(ctx.host, ctx.tenantId),
    getFeaturedBlogPosts(ctx.host, ctx.tenantId, 3),
  ]);

  if (!site) notFound();

  const TemplateLayout = pickTemplate(site.template?.slug ?? null);
  return (
    <TemplateLayout
      page="home"
      site={site}
      products={productList?.products ?? []}
      categories={categories}
      featuredBlogPosts={featuredBlogPosts}
    />
  );
}
