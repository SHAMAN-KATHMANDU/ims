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
  CategoryTiles,
  StorySplit,
  NewsletterBand,
} from "./shared";
import { FeaturedBlogSection } from "@/components/blog/FeaturedBlogSection";

/**
 * ARTISAN — Heritage crafts, story-first, warm greens. Heavy riff on
 * the shamanktm-website aesthetic: trust strip → category tiles →
 * "from the workshop" grid → founder story → journal → newsletter.
 * Best for folk art, handmade goods, heritage shops, spiritual stores.
 *
 * This is the densest template — every C.4 primitive is used at least
 * once.
 */
export async function ArtisanLayout(props: TemplateProps) {
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
    <div data-template="artisan">
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
              ctaLabel="Enter the workshop"
            />
          )}

          {sections.trust && (
            <TrustStrip
              items={[
                { label: "Made by hand", value: "Always" },
                { label: "Years in craft", value: "25+" },
                { label: "Workshops", value: "3" },
              ]}
            />
          )}

          {sections.categories && (
            <CategoryTiles
              categories={categories}
              columns={3}
              aspectRatio="1/1"
              heading="Browse the workshop"
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
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: "2.5rem",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: "var(--color-muted)",
                        marginBottom: "0.35rem",
                      }}
                    >
                      This week&apos;s pieces
                    </div>
                    <h2
                      style={{
                        fontSize: "clamp(1.875rem, 3vw, 2.5rem)",
                        fontFamily: "var(--font-display)",
                        fontWeight: 500,
                        margin: 0,
                      }}
                    >
                      From the workshop
                    </h2>
                  </div>
                  <a
                    href="/products"
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--color-muted)",
                    }}
                  >
                    See everything →
                  </a>
                </div>
                <ProductGrid products={products} columns={4} variant="card" />
              </div>
            </section>
          )}

          {sections.story && (
            <StorySplit
              eyebrow="Since 1998"
              title="A quarter century at the bench."
              body={`We opened the first workshop in 1998 with three tools and a lot of stubbornness. Today there are three workshops and the same stubbornness.

Every piece we sell is made, finished, or at least looked at by someone who has spent decades doing exactly that thing. We think you can tell.`}
              imageSide="right"
              imageCaption="The original workshop."
              cta={{ href: "/blog", label: "Read the journal" }}
            />
          )}

          {sections.articles && (
            <FeaturedBlogSection posts={featuredBlogPosts ?? []} />
          )}

          {sections.newsletter && (
            <NewsletterBand
              title="Letters from the workshop"
              subtitle="Seasonal notes, never more than once a month."
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
                fontWeight: 500,
              }}
            >
              Everything from the workshop
            </h1>
            <ProductGrid products={products} columns={4} variant="card" />
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
