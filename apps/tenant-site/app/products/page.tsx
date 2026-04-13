import { getTenantContext } from "@/lib/tenant";
import { getSite, getProducts, getCategories } from "@/lib/api";
import { pickTemplate } from "@/components/templates/pickTemplate";
import { notFound } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ page?: string; categoryId?: string }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const ctx = await getTenantContext();
  const [site, productList, categories] = await Promise.all([
    getSite(ctx.host, ctx.tenantId),
    getProducts(ctx.host, ctx.tenantId, {
      page,
      limit: 24,
      categoryId: params.categoryId,
    }),
    getCategories(ctx.host, ctx.tenantId),
  ]);

  if (!site) notFound();

  const TemplateLayout = pickTemplate(site.template?.slug ?? null);
  return (
    <TemplateLayout
      page="products"
      site={site}
      products={productList?.products ?? []}
      categories={categories}
      pagination={
        productList
          ? {
              page: productList.page,
              total: productList.total,
              limit: productList.limit,
            }
          : undefined
      }
    />
  );
}
