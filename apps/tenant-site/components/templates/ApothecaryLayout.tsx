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
import { getSiteFormatOptions } from "@/lib/format";

/**
 * APOTHECARY — Cream + sage, pharmacy-counter nostalgia. Leads with
 * trust metrics ("botanically sourced", "nothing synthetic"), then
 * a centered formulary hero, a story split about preparation, and
 * a monthly-bulletin newsletter. Best for skincare, candles, herbal
 * goods, perfume.
 */
export async function ApothecaryLayout(props: TemplateProps) {
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
    <div data-template="apothecary">
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
              ctaLabel="The formulary"
            />
          )}

          {sections.trust && (
            <TrustStrip
              items={[
                { label: "Botanically sourced", value: "100%" },
                { label: "Nothing synthetic", value: "Ever" },
                { label: "Formulated slowly", value: "By hand" },
              ]}
            />
          )}

          {sections.products && (
            <section style={{ padding: "var(--section-padding) 0 2rem" }}>
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
                    The formulary
                  </div>
                  <h2
                    style={{
                      fontSize: "clamp(1.875rem, 3vw, 2.5rem)",
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontWeight: 400,
                    }}
                  >
                    This week&apos;s preparations
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

          {sections.story && (
            <StorySplit
              eyebrow="The workshop"
              title="From field to formulary"
              body={`Each preparation starts in a field, a meadow, or a greenhouse — sometimes one we tend ourselves, more often one tended by the people we've worked with for years.

What happens next is slow, old-fashioned, and more or less the same as it was a hundred years ago. That's on purpose.`}
              imageSide="right"
              imageCaption="Fresh harvest, morning of."
            />
          )}

          {sections.articles && (
            <FeaturedBlogSection posts={featuredBlogPosts ?? []} />
          )}

          {sections.newsletter && (
            <NewsletterBand
              title="The monthly bulletin"
              subtitle="New preparations, short essays, seasonal notes."
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
                fontStyle: "italic",
                fontWeight: 400,
              }}
            >
              The formulary
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
