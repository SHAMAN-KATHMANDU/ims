import { getTenantContext } from "@/lib/tenant";
import type { TemplateProps } from "./types";
import {
  SiteHeader,
  Hero,
  ProductGrid,
  ProductDetail,
  ContactBlock,
  SiteFooter,
} from "./shared";
import { FeaturedBlogSection } from "@/components/blog/FeaturedBlogSection";
import { getSiteFormatOptions } from "@/lib/format";

/**
 * BOUTIQUE — Warm, story-first. Centered nav, soft spacing, a centred
 * "Our story" narrative block above products, gentle rounded edges via
 * the radius token.
 */
export async function BoutiqueLayout(props: TemplateProps) {
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
    <div data-template="boutique">
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
            <Hero site={site} host={ctx.host} variant="boutique" />
          )}

          {sections.story && (
            <section
              style={{
                padding: "var(--section-padding) 0",
                background: "var(--color-surface)",
              }}
            >
              <div
                className="container"
                style={{ maxWidth: 720, textAlign: "center" }}
              >
                <div
                  style={{
                    fontSize: "0.72rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--color-muted)",
                    marginBottom: "0.75rem",
                  }}
                >
                  Our story
                </div>
                <h2
                  style={{
                    fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                    marginBottom: "1.5rem",
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                  }}
                >
                  Crafted with care, offered with intention.
                </h2>
                <p
                  style={{
                    color: "var(--color-muted)",
                    lineHeight: 1.75,
                    fontSize: "1.05rem",
                  }}
                >
                  Each piece in this shop is chosen for the way it feels, the
                  life it invites, and the maker behind it. Nothing rushed,
                  nothing arbitrary.
                </p>
              </div>
            </section>
          )}

          {sections.products && (
            <section style={{ padding: "var(--section-padding) 0 2rem" }}>
              <div className="container">
                <h2
                  style={{
                    fontSize: "clamp(1.75rem, 2.75vw, 2.25rem)",
                    marginBottom: "2.5rem",
                    textAlign: "center",
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                  }}
                >
                  This week&apos;s pieces
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

          {sections.contact && <ContactBlock site={site} />}
        </>
      )}

      {page === "products" && (
        <section style={{ padding: "var(--section-padding) 0" }}>
          <div className="container">
            <h1
              style={{
                fontSize: "clamp(2rem, 3.5vw, 2.5rem)",
                fontFamily: "var(--font-display)",
                marginBottom: "2rem",
                fontWeight: 500,
              }}
            >
              The shop
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
