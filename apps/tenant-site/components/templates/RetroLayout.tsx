import { getTenantContext } from "@/lib/tenant";
import type { TemplateProps } from "./types";
import {
  SiteHeader,
  ProductGrid,
  ProductDetail,
  ContactBlock,
  SiteFooter,
  StatsBand,
  NewsletterBand,
} from "./shared";
import { FeaturedBlogSection } from "@/components/blog/FeaturedBlogSection";
import { brandingDisplayName, brandingTagline } from "@/lib/theme";
import { getSiteFormatOptions } from "@/lib/format";

/**
 * RETRO — 70s / 80s revival. Chunky type, rounded pills, bold colors,
 * stats band. Lots of character. Suits vinyl, skate, streetwear,
 * kitsch homeware.
 */
export async function RetroLayout(props: TemplateProps) {
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
  const name = brandingDisplayName(site.branding, ctx.host);
  const tagline = brandingTagline(site.branding);
  const formatOpts = getSiteFormatOptions(site);

  return (
    <div data-template="retro">
      <SiteHeader
        site={site}
        host={ctx.host}
        categories={categories}
        navPages={navPages}
        variant="standard"
      />

      {page === "home" && (
        <>
          {sections.hero && (
            <section
              style={{
                padding: "var(--section-padding) 0",
                textAlign: "center",
                background: "var(--color-background)",
              }}
            >
              <div className="container">
                <div
                  style={{
                    display: "inline-block",
                    padding: "0.55rem 1.4rem",
                    borderRadius: 999,
                    border: "2px solid var(--color-text)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    marginBottom: "2rem",
                    fontWeight: 700,
                  }}
                >
                  ★ Now in stock ★
                </div>
                <h1
                  style={{
                    fontSize: "clamp(3rem, 8vw, 6rem)",
                    fontWeight: 900,
                    lineHeight: 0.92,
                    letterSpacing: "-0.035em",
                    textTransform: "uppercase",
                    margin: "0 auto",
                    maxWidth: 900,
                    color: "var(--color-text)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {name}
                </h1>
                {tagline && (
                  <p
                    style={{
                      marginTop: "2rem",
                      fontSize: "1.125rem",
                      color: "var(--color-muted)",
                      maxWidth: 540,
                      margin: "2rem auto 0",
                      lineHeight: 1.6,
                    }}
                  >
                    {tagline}
                  </p>
                )}
                <div style={{ marginTop: "2.5rem" }}>
                  <a href="/products" className="btn">
                    Shop the whole thing
                  </a>
                </div>
              </div>
            </section>
          )}

          {sections.trust && (
            <StatsBand
              items={[
                { value: `${products.length}+`, label: "In the shop" },
                { value: `${categories.length}`, label: "Categories" },
                { value: "∞", label: "Good vibes" },
              ]}
            />
          )}

          {sections.products && (
            <section style={{ padding: "var(--section-padding) 0 2rem" }}>
              <div className="container">
                <h2
                  style={{
                    fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                    marginBottom: "2rem",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "-0.01em",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  Top sellers
                </h2>
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
              title="Join the list"
              subtitle="New drops, weekend specials, occasional rants."
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
                fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
                marginBottom: "2rem",
                fontWeight: 900,
                textTransform: "uppercase",
                fontFamily: "var(--font-display)",
              }}
            >
              The whole shop
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
