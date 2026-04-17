/**
 * /offers — a read-only list of products currently on an active
 * ProductDiscount. Matches the public /public/offers endpoint; the
 * page renders via the shared ProductGrid so the card chrome
 * (discount badge, struck-through MRP) reuses the listing logic.
 *
 * We don't pick up `products-index` here because the offers page is
 * a simpler, single-purpose view — tenants who want custom blocks on
 * /offers should wire a dedicated SiteLayout slot in a future phase.
 */

import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { getSite, getCategories, getNavPages, getOffers } from "@/lib/api";
import {
  SiteHeader,
  SiteFooter,
  ProductGrid,
} from "@/components/templates/shared";

export const metadata = {
  title: "Offers",
  description: "Products currently on discount.",
};

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
  const [site, offersList, categories, navPages] = await Promise.all([
    getSite(ctx.host, ctx.tenantId),
    getOffers(ctx.host, ctx.tenantId, { page, limit: 24 }),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
  ]);

  if (!site) notFound();

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
