import { getTenantContext } from "@/lib/tenant";
import { getSiteWithProfile, getCategories, getNavPages } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/templates/shared";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
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
    if (!site) return { title: "Checkout" };
    const bp = site.businessProfile;
    const name =
      bp?.displayName?.trim() ||
      brandingDisplayName(site.branding ?? null, ctx.host);
    return {
      title: `Checkout · ${name}`,
      description: `Complete your order at ${name}.`,
      robots: { index: false, follow: true },
    };
  } catch {
    return { title: "Checkout" };
  }
}

export default async function CheckoutRoute() {
  const ctx = await getTenantContext();
  const [site, categories, navPages] = await Promise.all([
    getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug),
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
        id="main-content"
        className="container"
        style={{ padding: "var(--section-padding) 0" }}
      >
        <CheckoutForm host={ctx.host} tenantId={ctx.tenantId} />
      </main>
      <SiteFooter site={site} host={ctx.host} navPages={navPages} />
    </div>
  );
}
