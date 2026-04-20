import { getTenantContext } from "@/lib/tenant";
import type { TemplateProps } from "./types";
import Link from "next/link";
import {
  SiteHeader,
  Hero,
  ProductGrid,
  ProductDetail,
  ContactBlock,
  SiteFooter,
} from "./shared";
import { FeaturedBlogSection } from "@/components/blog/FeaturedBlogSection";
import { formatPrice, getSiteFormatOptions } from "@/lib/format";

/**
 * LUXURY — Dark-first, serif display type, a taller hero, generous
 * whitespace, an optional lookbook band. Uses the split nav so the brand
 * name anchors the center.
 */
export async function LuxuryLayout(props: TemplateProps) {
  const ctx = await getTenantContext();
  const {
    page,
    site,
    products,
    categories,
    navPages,
    sections,
    activeProduct,
    featuredBlogPosts,
  } = props;

  const lookbookItems = products.slice(0, 2);
  const formatOpts = getSiteFormatOptions(site);

  return (
    <div
      data-template="luxury"
      style={{
        background: "var(--color-background)",
        color: "var(--color-text)",
      }}
    >
      <SiteHeader
        site={site}
        host={ctx.host}
        categories={categories}
        navPages={navPages}
        variant="split"
      />

      {page === "home" && (
        <>
          {sections.hero && (
            <Hero site={site} host={ctx.host} variant="luxury" />
          )}

          {sections.products && (
            <section
              style={{
                padding: "var(--section-padding) 0",
                borderTop: "1px solid var(--color-border)",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <div className="container">
                <h2
                  style={{
                    fontSize: "clamp(2rem, 3vw, 2.5rem)",
                    marginBottom: "3rem",
                    textAlign: "center",
                    letterSpacing: "0.08em",
                    fontFamily: "var(--font-display)",
                    textTransform: "uppercase",
                    fontWeight: 400,
                  }}
                >
                  The collection
                </h2>
                <ProductGrid
                  products={products}
                  columns={3}
                  variant="bare"
                  formatOpts={formatOpts}
                />
              </div>
            </section>
          )}

          {sections.lookbook && lookbookItems.length > 0 && (
            <section style={{ padding: "var(--section-padding) 0" }}>
              <div className="container">
                <div
                  style={{
                    fontSize: "0.75rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--color-muted)",
                    marginBottom: "0.75rem",
                    textAlign: "center",
                  }}
                >
                  Lookbook
                </div>
                <h2
                  style={{
                    fontSize: "clamp(1.75rem, 2.5vw, 2.25rem)",
                    marginBottom: "3rem",
                    textAlign: "center",
                    fontFamily: "var(--font-display)",
                    fontWeight: 400,
                  }}
                >
                  Pieces to live with
                </h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                    gap: "2rem",
                  }}
                >
                  {lookbookItems.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}`}
                      style={{ display: "block", color: "var(--color-text)" }}
                    >
                      <div
                        style={{
                          aspectRatio: "4/5",
                          background: "var(--color-surface)",
                          borderRadius: "var(--radius)",
                          marginBottom: "1.5rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--color-muted)",
                          fontSize: "0.85rem",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {p.imsCode}
                      </div>
                      <div
                        style={{
                          fontSize: "1.25rem",
                          fontFamily: "var(--font-display)",
                          marginBottom: "0.35rem",
                        }}
                      >
                        {p.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--color-muted)",
                        }}
                      >
                        {formatPrice(p.finalSp, formatOpts)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {sections.articles && (
            <FeaturedBlogSection posts={featuredBlogPosts ?? []} />
          )}

          {sections.contact && <ContactBlock site={site} />}
        </>
      )}

      {page === "products" && (
        <section style={{ padding: "var(--section-padding) 0" }}>
          <div className="container">
            <h1
              style={{
                fontSize: "clamp(2.25rem, 4vw, 3rem)",
                marginBottom: "3rem",
                textAlign: "center",
                letterSpacing: "0.08em",
                fontFamily: "var(--font-display)",
                textTransform: "uppercase",
                fontWeight: 400,
              }}
            >
              The collection
            </h1>
            <ProductGrid
              products={products}
              columns={3}
              variant="bare"
              formatOpts={formatOpts}
            />
          </div>
        </section>
      )}

      {page === "product" && activeProduct && (
        <ProductDetail product={activeProduct} formatOpts={formatOpts} />
      )}

      {page === "contact" && <ContactBlock site={site} />}

      <SiteFooter site={site} host={ctx.host} navPages={navPages} />
    </div>
  );
}
