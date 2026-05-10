import { getTenantContext } from "@/lib/tenant";
import {
  getSiteWithProfile,
  getCategories,
  getNavPages,
  getSiteLayout,
} from "@/lib/api";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { brandingDisplayName } from "@/lib/theme";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { BlockDataContext } from "@/components/blocks/data-context";
import { buildAssetMap } from "@/components/blocks/build-asset-map";
import type { BlockNode } from "@repo/shared";

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
  const [site, categories, navPages, headerLayout, cartLayout, footerLayout] =
    await Promise.all([
      getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug),
      getCategories(ctx.host, ctx.tenantId),
      getNavPages(ctx.host, ctx.tenantId),
      getSiteLayout(ctx.host, ctx.tenantId, "header").catch(() => null),
      getSiteLayout(ctx.host, ctx.tenantId, "cart").catch(() => null),
      getSiteLayout(ctx.host, ctx.tenantId, "footer").catch(() => null),
    ]);
  if (!site) notFound();

  const blocks = [
    ...(Array.isArray(headerLayout?.blocks)
      ? (headerLayout.blocks as BlockNode[])
      : []),
    ...(Array.isArray(cartLayout?.blocks)
      ? (cartLayout.blocks as BlockNode[])
      : []),
    ...(Array.isArray(footerLayout?.blocks)
      ? (footerLayout.blocks as BlockNode[])
      : []),
  ];

  const assets = await buildAssetMap(ctx.host, ctx.tenantId, blocks);

  const dataContext: BlockDataContext = {
    site,
    host: ctx.host,
    tenantId: ctx.tenantId,
    categories,
    navPages,
    products: [],
    featuredBlogPosts: [],
    assets,
  };

  return (
    <div data-page="checkout">
      <BlockRenderer nodes={blocks} dataContext={dataContext} />
      <main
        id="main-content"
        className="container"
        style={{ padding: "var(--section-padding) 0" }}
      >
        <CheckoutForm host={ctx.host} tenantId={ctx.tenantId} />
      </main>
    </div>
  );
}
