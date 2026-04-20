import { getTenantContext } from "@/lib/tenant";
import type { TemplateProps } from "./types";
import {
  SiteHeader,
  Hero,
  ProductGrid,
  ProductDetail,
  ContactBlock,
  SiteFooter,
  BentoShowcase,
  StatsBand,
  NewsletterBand,
} from "./shared";
import { FeaturedBlogSection } from "@/components/blog/FeaturedBlogSection";
import { getSiteFormatOptions } from "@/lib/format";

/**
 * DARK — Pure dark mode, neon accents, bento-style product showcase,
 * tight stats band. Built for gaming, audio, streetwear, and tech
 * accessories. The one tenants pick when they want their site to feel
 * like a drop page.
 *
 * Assumes a dark branding payload (background near black, text near
 * white). The theme="dark" defaults in globals.css catch tenants that
 * pick this template without customizing.
 */
export async function DarkLayout(props: TemplateProps) {
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
    <div
      data-template="dark"
      data-theme="dark"
      style={{
        background: "var(--color-background)",
        color: "var(--color-text)",
        minHeight: "100vh",
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
            <Hero
              site={site}
              host={ctx.host}
              variant="luxury"
              ctaLabel="See latest drops"
            />
          )}

          {sections.bento && (
            <BentoShowcase
              products={products}
              eyebrow="Hand-picked"
              heading="The featured bay"
              formatOpts={formatOpts}
            />
          )}

          {sections.trust && (
            <StatsBand
              dark
              items={[
                { value: "24/7", label: "Drops" },
                { value: "<2d", label: "Shipping" },
                { value: "∞", label: "Returns" },
              ]}
            />
          )}

          {sections.products && (
            <section style={{ padding: "var(--section-padding) 0 2rem" }}>
              <div className="container">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "2rem",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      margin: 0,
                    }}
                  >
                    Latest drops
                  </h2>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-muted)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {products.length} pieces live
                  </div>
                </div>
                <ProductGrid
                  products={products}
                  columns={4}
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
              title="Drop alerts"
              subtitle="Get notified the moment new stuff lands."
              cta="Notify me"
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
                fontSize: "clamp(2rem, 3.5vw, 2.5rem)",
                marginBottom: "2rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              All drops
            </h1>
            <ProductGrid
              products={products}
              columns={4}
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
