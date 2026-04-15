import { getTenantContext } from "@/lib/tenant";
import { getSite, getCategories, getNavPages } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/templates/shared";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = { title: "Checkout" };

export default async function CheckoutRoute() {
  const ctx = await getTenantContext();
  const [site, categories, navPages] = await Promise.all([
    getSite(ctx.host, ctx.tenantId),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
  ]);
  if (!site) notFound();

  return (
    <div data-page="checkout">
      <SiteHeader
        site={site}
        host={ctx.host}
        categories={categories}
        navPages={navPages}
      />
      <main
        className="container"
        style={{ padding: "var(--section-padding) 0" }}
      >
        <CheckoutForm host={ctx.host} tenantId={ctx.tenantId} />
      </main>
      <SiteFooter site={site} host={ctx.host} navPages={navPages} />
    </div>
  );
}
