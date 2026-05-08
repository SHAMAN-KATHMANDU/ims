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
import {
  SiteHeader,
  SiteFooter,
  ProductGrid,
} from "@/components/templates/shared";
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

  // Fallback: hardcoded layout for tenants who haven't customised the page.
  const products = offersList?.products ?? [];

  return (
    <>
      <SiteHeader
        site={site}
        host={ctx.host}
        categories={categories}
        navPages={navPages}
      />
      <main>
        <section style={{ padding: "var(--section-padding) 0" }}>
          <div className="container">
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <div
                style={{
                  fontSize: "0.72rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--color-muted)",
                  marginBottom: "0.5rem",
                }}
              >
                Limited time
              </div>
              <h1
                style={{
                  fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                  fontFamily: "var(--font-display)",
                  margin: 0,
                }}
              >
                Offers
              </h1>
              {offersList && offersList.total > 0 && (
                <p
                  style={{
                    marginTop: "0.5rem",
                    color: "var(--color-muted)",
                    fontSize: "0.9rem",
                  }}
                >
                  {offersList.total} products on discount
                </p>
              )}
            </div>
            {products.length > 0 ? (
              <ProductGrid products={products} columns={4} variant="bordered" />
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "4rem 1rem",
                  color: "var(--color-muted)",
                }}
              >
                No offers right now — check back soon.
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter site={site} host={ctx.host} navPages={navPages} />
    </>
  );
}
