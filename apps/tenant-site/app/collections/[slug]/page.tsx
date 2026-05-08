/**
 * /collections/[slug] — public landing for a curated collection.
 * Reads the same `/public/collections/:slug` endpoint the product-grid
 * block uses, and renders the products in their admin-curated order.
 *
 * Inactive or missing collections 404.
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenantContext } from "@/lib/tenant";
import {
  getSiteWithProfile,
  getCategories,
  getNavPages,
  getCollection,
  getSiteLayout,
} from "@/lib/api";
import { ProductGrid } from "@/components/templates/shared";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import type { BlockDataContext } from "@/components/blocks/data-context";
import type { BlockNode } from "@repo/shared";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await getTenantContext().catch(() => null);
  if (!ctx) return { title: "Collection" };
  const res = await getCollection(ctx.host, ctx.tenantId, slug).catch(
    () => null,
  );
  if (!res) return { title: "Collection" };
  const collection = "collection" in res ? res.collection : res;
  return {
    title: collection.title,
    description: collection.subtitle ?? undefined,
  };
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const ctx = await getTenantContext();
  const [
    site,
    categories,
    navPages,
    collectionRes,
    headerLayout,
    footerLayout,
  ] = await Promise.all([
    getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
    getCollection(ctx.host, ctx.tenantId, slug, 48),
    getSiteLayout(ctx.host, ctx.tenantId, "header").catch(() => null),
    getSiteLayout(ctx.host, ctx.tenantId, "footer").catch(() => null),
  ]);

  if (!site) notFound();
  if (!collectionRes) notFound();
  const collection =
    "collection" in collectionRes ? collectionRes.collection : collectionRes;
  if (!collection) notFound();

  const blocks = [
    ...(Array.isArray(headerLayout?.blocks)
      ? (headerLayout.blocks as BlockNode[])
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
      <BlockRenderer nodes={blocks} dataContext={dataContext} />
      <main>
        <section style={{ padding: "var(--section-padding) 0" }}>
          <div className="container">
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <h1
                style={{
                  fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                  fontFamily: "var(--font-display)",
                  margin: 0,
                }}
              >
                {collection.title}
              </h1>
              {collection.subtitle && (
                <p
                  style={{
                    marginTop: "0.75rem",
                    color: "var(--color-muted)",
                    fontSize: "0.95rem",
                  }}
                >
                  {collection.subtitle}
                </p>
              )}
            </div>
            {collection.products.length > 0 ? (
              <ProductGrid
                products={collection.products}
                columns={4}
                variant="bordered"
              />
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "4rem 1rem",
                  color: "var(--color-muted)",
                }}
              >
                Nothing in this collection yet — check back soon.
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
