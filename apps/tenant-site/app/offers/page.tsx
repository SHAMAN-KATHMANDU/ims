import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenantContext } from "@/lib/tenant";
import {
  getSiteWithProfile,
  getCategories,
  getNavPages,
  getOffers,
  getSiteLayout,
} from "@/lib/api";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { brandingDisplayName } from "@/lib/theme";
import type { BlockDataContext } from "@/components/blocks/data-context";
import type { BlockNode } from "@repo/shared";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const ctx = await getTenantContext();
    const site = await getSiteWithProfile(
      ctx.host,
      ctx.tenantId,
      ctx.tenantSlug,
    );
    if (!site) {
      return {
        title: "Offers",
        description: "Products currently on discount.",
      };
    }
    const bp = site.businessProfile;
    const name =
      bp?.displayName?.trim() ||
      brandingDisplayName(site.branding ?? null, ctx.host);
    return {
      title: `Offers · ${name}`,
      description: `Products currently on discount at ${name}.`,
    };
  } catch {
    return { title: "Offers", description: "Products currently on discount." };
  }
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getOne(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function OffersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(getOne(params.page) ?? "1") || 1;

  const ctx = await getTenantContext();
  const [
    site,
    offersList,
    categories,
    navPages,
    headerLayout,
    pageLayout,
    footerLayout,
  ] = await Promise.all([
    getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug),
    getOffers(ctx.host, ctx.tenantId, { page, limit: 24 }),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
    getSiteLayout(ctx.host, ctx.tenantId, "header").catch(() => null),
    getSiteLayout(ctx.host, ctx.tenantId, "offers").catch(() => null),
    getSiteLayout(ctx.host, ctx.tenantId, "footer").catch(() => null),
  ]);

  if (!site) notFound();

  // Block-first: if a tenant has built a custom "offers" layout in the site
  // editor, use BlockRenderer with optional header/footer chrome. Falls back
  // to the hardcoded grid below.
  if (
    pageLayout &&
    Array.isArray(pageLayout.blocks) &&
    pageLayout.blocks.length > 0
  ) {
    const blocks = [
      ...(Array.isArray(headerLayout?.blocks)
        ? (headerLayout.blocks as BlockNode[])
        : []),
      ...(Array.isArray(pageLayout.blocks)
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
      products: offersList?.products ?? [],
      featuredBlogPosts: [],
      productsPage: page,
      productsTotal: offersList?.total,
      searchParams: params,
    };
    return (
      <>
        <main>
          <BlockRenderer nodes={blocks} dataContext={dataContext} />
        </main>
      </>
    );
  }

  // All offers pages are now block-based. Return 404 if no custom layout is defined.
  notFound();
}
