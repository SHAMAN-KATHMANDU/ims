import { getTenantContext } from "@/lib/tenant";
import { getSite, getProduct, getCategories } from "@/lib/api";
import { pickTemplate } from "@/components/templates/pickTemplate";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await getTenantContext();

  const [site, product, categories] = await Promise.all([
    getSite(ctx.host, ctx.tenantId),
    getProduct(ctx.host, ctx.tenantId, id),
    getCategories(ctx.host, ctx.tenantId),
  ]);

  if (!site || !product) notFound();

  const TemplateLayout = pickTemplate(site.template?.slug ?? null);
  return (
    <TemplateLayout
      page="product"
      site={site}
      products={[product]}
      categories={categories}
      activeProduct={product}
    />
  );
}
