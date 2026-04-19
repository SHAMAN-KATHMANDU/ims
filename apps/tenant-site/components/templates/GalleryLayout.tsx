import { getTenantContext } from "@/lib/tenant";
import type { TemplateProps } from "./types";
import {
  SiteHeader,
  ProductGrid,
  ProductDetail,
  ContactBlock,
  SiteFooter,
  BentoShowcase,
} from "./shared";
import { FeaturedBlogSection } from "@/components/blog/FeaturedBlogSection";
import { brandingDisplayName, brandingTagline } from "@/lib/theme";
import { getSiteFormatOptions } from "@/lib/format";

/**
 * GALLERY — Product-as-art. Minimal chrome, oversized imagery via
 * the bento showcase, a quiet hero with exhibition-style typography,
 * no CTAs shouting. For limited-run design objects, prints, fine art.
 */
export async function GalleryLayout(props: TemplateProps) {
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
    <div data-template="gallery">
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
            <section style={{ padding: "8rem 0 2rem", textAlign: "center" }}>
              <div className="container">
                <div
                  style={{
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.22em",
                    color: "var(--color-muted)",
                    marginBottom: "1rem",
                  }}
                >
                  Current exhibition · {new Date().getFullYear()}
                </div>
                <h1
                  style={{
                    fontSize: "clamp(2.25rem, 4vw, 3.25rem)",
                    fontWeight: 300,
                    letterSpacing: "-0.01em",
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    lineHeight: 1.15,
                  }}
                >
                  {name}
                </h1>
                {tagline && (
                  <p
                    style={{
                      marginTop: "1.25rem",
                      fontStyle: "italic",
                      color: "var(--color-muted)",
                      maxWidth: 560,
                      margin: "1.25rem auto 0",
                      lineHeight: 1.7,
                    }}
                  >
                    {tagline}
                  </p>
                )}
              </div>
            </section>
          )}

          {sections.bento && (
            <BentoShowcase
              products={products}
              eyebrow="Selected works"
              formatOpts={formatOpts}
            />
          )}

          {sections.products && (
            <section style={{ padding: "var(--section-padding) 0 6rem" }}>
              <div className="container">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "2rem",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "1rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    Full catalog
                  </h2>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-muted)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {products.length} works
                  </div>
                </div>
                <ProductGrid
                  products={products}
                  columns={3}
                  variant="bare"
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
        <section style={{ padding: "6rem 0 var(--section-padding)" }}>
          <div className="container">
            <h1
              style={{
                fontSize: "clamp(1.75rem, 2.5vw, 2.25rem)",
                marginBottom: "3rem",
                fontWeight: 300,
                fontFamily: "var(--font-display)",
              }}
            >
              Catalog
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
