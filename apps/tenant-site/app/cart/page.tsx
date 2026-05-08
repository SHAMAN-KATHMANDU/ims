import { getTenantContext } from "@/lib/tenant";
import {
  getSiteWithProfile,
  getCategories,
  getNavPages,
  getSiteLayout,
} from "@/lib/api";
import { CartPage } from "@/components/cart/CartPage";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { brandingDisplayName } from "@/lib/theme";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { BlockDataContext } from "@/components/blocks/data-context";
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

  const dataContext: BlockDataContext = {
    site,
    host: ctx.host,
    tenantId: ctx.tenantId,
    categories,
    navPages,
    products: [],
    featuredBlogPosts: [],
  };

  return (
    <main id="main-content" data-page="cart">
      <BlockRenderer nodes={blocks} dataContext={dataContext} />
      <CartPage />
    </main>
  );
}
