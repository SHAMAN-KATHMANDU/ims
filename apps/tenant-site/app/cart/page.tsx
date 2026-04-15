import { getTenantContext } from "@/lib/tenant";
import { getSite, getCategories, getNavPages } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/templates/shared";
import { CartPage } from "@/components/cart/CartPage";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cart" };

export default async function CartRoute() {
  const ctx = await getTenantContext();
  const [site, categories, navPages] = await Promise.all([
    getSite(ctx.host, ctx.tenantId),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
  ]);
  if (!site) notFound();

  return (
    <div data-page="cart">
      <SiteHeader
        site={site}
        host={ctx.host}
        categories={categories}
        navPages={navPages}
      />
      <CartPage />
      <SiteFooter site={site} host={ctx.host} navPages={navPages} />
    </div>
  );
}
