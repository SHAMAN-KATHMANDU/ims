import { getTenantContext } from "@/lib/tenant";
import type { TemplateProps } from "./types";
import {
  SiteHeader,
  Hero,
  ProductGrid,
  ProductDetail,
  ContactBlock,
  SiteFooter,
  CategoryTiles,
  NewsletterBand,
} from "./shared";
import { FeaturedBlogSection } from "@/components/blog/FeaturedBlogSection";
import { getSiteFormatOptions } from "@/lib/format";

/**
 * COASTAL — Breezy, light serif, airy spacing. Blue/white palette,
 * italic headings, tall category tiles. For linen, beachwear,
 * resortwear, travel brands.
 */
export async function CoastalLayout(props: TemplateProps) {
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
  const formatOpts = getSiteFormatOptions(site);

  return (
    <div data-template="coastal">
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
            <Hero
              site={site}
              host={ctx.host}
              variant="boutique"
              ctaLabel="Made for warm afternoons"
            />
          )}

          {sections.categories && (
            <CategoryTiles
              categories={categories}
              columns={3}
              aspectRatio="3/4"
              heading="Shop the season"
            />
          )}

          {sections.products && (
            <section
              style={{
                padding: "var(--section-padding) 0 2rem",
                background: "var(--color-surface)",
              }}
            >
              <div className="container">
                <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--color-muted)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    The current edit
                  </div>
                  <h2
                    style={{
                      fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontWeight: 400,
                    }}
                  >
                    Made for warm afternoons
                  </h2>
                </div>
                <ProductGrid
                  products={products}
                  columns={3}
                  variant="card"
                  formatOpts={formatOpts}
                />
              </div>
            </section>
          )}

          {sections.articles && (
            <FeaturedBlogSection posts={featuredBlogPosts ?? []} />
          )}

          {sections.newsletter && (
            <NewsletterBand
              title="Postcards"
              subtitle="Notes from the shop, a few times a year."
            />
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
                marginBottom: "2.5rem",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                textAlign: "center",
                fontWeight: 400,
              }}
            >
              The collection
            </h1>
            <ProductGrid
              products={products}
              columns={3}
              variant="card"
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
