import { getTenantContext } from "@/lib/tenant";
import type { TemplateProps } from "./types";
import {
  SiteHeader,
  Hero,
  ProductGrid,
  ProductDetail,
  ContactBlock,
  SiteFooter,
  TrustStrip,
  StorySplit,
  NewsletterBand,
} from "./shared";
import { FeaturedBlogSection } from "@/components/blog/FeaturedBlogSection";

/**
 * ORGANIC — Warm earth tones, lifestyle-first, gentle curves. Leads
 * with a trust strip of "naturally sourced / small batch / shipped
 * carefully" metrics, a card-style product grid, and a seasonal
 * story block. Suits natural, handcrafted, wellness brands.
 */
export async function OrganicLayout(props: TemplateProps) {
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

  return (
    <div data-template="organic">
      <SiteHeader
        site={site}
        host={ctx.host}
        categories={categories}
        navPages={navPages}
        variant="centered"
      />

      {page === "home" && (
        <>
          {sections.hero && (
            <Hero
              site={site}
              host={ctx.host}
              variant="boutique"
              ctaLabel="Harvested this season"
            />
          )}

          {sections.trust && (
            <TrustStrip
              items={[
                { label: "Naturally sourced", value: "100%" },
                { label: "Small-batch", value: "Always" },
                { label: "Shipped carefully", value: "Free" },
              ]}
            />
          )}

          {sections.products && (
            <section style={{ padding: "var(--section-padding) 0 2rem" }}>
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
                    In season
                  </div>
                  <h2
                    style={{
                      fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontWeight: 500,
                    }}
                  >
                    Harvested this month
                  </h2>
                </div>
                <ProductGrid products={products} columns={3} variant="card" />
              </div>
            </section>
          )}

          {sections.story && (
            <StorySplit
              eyebrow="How we work"
              title="Made the slow way"
              body={`We don't rush. Every piece takes the time it takes — hours of hand-finishing, weeks of resting, months from harvest to shelf.

If that sounds slow, it is. It's also why each piece ends up feeling the way it does.`}
              imageSide="right"
            />
          )}

          {sections.articles && (
            <FeaturedBlogSection posts={featuredBlogPosts ?? []} />
          )}

          {sections.newsletter && (
            <NewsletterBand
              title="Seasonal letters"
              subtitle="A short note from the studio each month."
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
                fontFamily: "var(--font-display)",
                fontWeight: 500,
              }}
            >
              The shop
            </h1>
            <ProductGrid products={products} columns={3} variant="card" />
          </div>
        </section>
      )}

      {page === "product" && activeProduct && (
        <ProductDetail product={activeProduct} />
      )}

      {page === "contact" && <ContactBlock site={site} />}

      <SiteFooter site={site} host={ctx.host} navPages={navPages} />
    </div>
  );
}
