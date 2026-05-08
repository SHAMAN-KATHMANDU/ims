import type { Metadata } from "next";
import { getTenantContext } from "@/lib/tenant";
import {
  getSiteWithProfile,
  getCategories,
  getNavPages,
  getSiteLayout,
} from "@/lib/api";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import type { BlockDataContext } from "@/components/blocks/data-context";
import type { BlockNode } from "@repo/shared";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with us.",
};

export default async function ContactPage() {
  const ctx = await getTenantContext();
  const [site, categories, navPages, headerLayout, pageLayout, footerLayout] =
    await Promise.all([
      getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug),
      getCategories(ctx.host, ctx.tenantId),
      getNavPages(ctx.host, ctx.tenantId),
      getSiteLayout(ctx.host, ctx.tenantId, "header").catch(() => null),
      getSiteLayout(ctx.host, ctx.tenantId, "contact").catch(() => null),
      getSiteLayout(ctx.host, ctx.tenantId, "footer").catch(() => null),
    ]);

  if (!site) notFound();

  const blocks = [
    ...(Array.isArray(headerLayout?.blocks)
      ? (headerLayout.blocks as BlockNode[])
      : []),
    ...(Array.isArray(pageLayout?.blocks)
      ? (pageLayout.blocks as BlockNode[])
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
    <>
      <main>
        <BlockRenderer nodes={blocks} dataContext={dataContext} />
      </main>
    </>
  );
}
