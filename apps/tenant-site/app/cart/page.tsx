import { getTenantContext } from "@/lib/tenant";
import { getSiteWithProfile, getCategories, getNavPages } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/templates/shared";
import { CartPage } from "@/components/cart/CartPage";
import { brandingDisplayName } from "@/lib/theme";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const ctx = await getTenantContext();
    const site = await getSiteWithProfile(
      ctx.host,
      ctx.tenantId,
      ctx.tenantSlug,
    );
    if (!site) return { title: "Cart" };
    const bp = site.businessProfile;
    const name =
      bp?.displayName?.trim() ||
      brandingDisplayName(site.branding ?? null, ctx.host);
    return {
      title: `Cart · ${name}`,
      description: `Review the items in your cart at ${name}.`,
      robots: { index: false, follow: true },
    };
  } catch {
    return { title: "Cart" };
  }
}

export default async function CartRoute() {
  const ctx = await getTenantContext();
  const [site, categories, navPages] = await Promise.all([
    getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
  ]);
  if (!site) notFound();

  return (
    <main id="main-content" data-page="cart">
      <SiteHeader
        site={site}
        host={ctx.host}
        categories={categories}
        navPages={navPages}
      />
      <CartPage />
      <SiteFooter site={site} host={ctx.host} navPages={navPages} />
    </main>
  );
}
