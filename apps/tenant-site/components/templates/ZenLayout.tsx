import { getTenantContext } from "@/lib/tenant";
import type { TemplateProps } from "./types";
import {
  SiteHeader,
  ProductGrid,
  ProductDetail,
  ContactBlock,
  SiteFooter,
  StorySplit,
} from "./shared";
import { FeaturedBlogSection } from "@/components/blog/FeaturedBlogSection";
import { brandingDisplayName, brandingTagline } from "@/lib/theme";

/**
 * ZEN — Japanese-inspired. Ultra-wide whitespace, thin type, muted
 * palette, slow rhythm. A narrow content column constrains everything
 * — nothing goes edge-to-edge. Suits ceramics, tea, stationery,
 * craft, wellness brands.
 */
export async function ZenLayout(props: TemplateProps) {
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

  return (
    <div data-template="zen">
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
            <section style={{ padding: "10rem 0 8rem", textAlign: "center" }}>
              <div
                className="container"
                style={{ maxWidth: 720, margin: "0 auto" }}
              >
                <div
                  style={{
                    width: 40,
                    height: 1,
                    background: "var(--color-text)",
                    opacity: 0.35,
                    margin: "0 auto 2rem",
                  }}
                />
                <h1
                  style={{
                    fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                    fontWeight: 300,
                    letterSpacing: "0.02em",
                    lineHeight: 1.35,
                    margin: 0,
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {name}
                </h1>
                {tagline && (
                  <p
                    style={{
                      marginTop: "2rem",
                      color: "var(--color-muted)",
                      fontWeight: 300,
                      letterSpacing: "0.04em",
                      fontSize: "1rem",
                      lineHeight: 1.8,
                    }}
                  >
                    {tagline}
                  </p>
                )}
              </div>
            </section>
          )}

          {sections.products && (
            <section style={{ padding: "2rem 0 10rem" }}>
              <div
                className="container"
                style={{ maxWidth: 880, margin: "0 auto" }}
              >
                <ProductGrid products={products} columns={2} variant="bare" />
              </div>
            </section>
          )}

          {sections.story && (
            <StorySplit
              eyebrow="—"
              title="Less, considered."
              body={`Each piece here is chosen carefully. Nothing extra, nothing for its own sake. We believe small collections invite more attention than large ones, and more attention means a better object.`}
              imageSide="left"
            />
          )}

          {sections.articles && (
            <FeaturedBlogSection posts={featuredBlogPosts ?? []} />
          )}

          {sections.contact && <ContactBlock site={site} />}
        </>
      )}

      {page === "products" && (
        <section style={{ padding: "8rem 0" }}>
          <div
            className="container"
            style={{ maxWidth: 880, margin: "0 auto" }}
          >
            <h1
              style={{
                fontSize: "clamp(1.75rem, 2.5vw, 2rem)",
                fontWeight: 300,
                marginBottom: "4rem",
                textAlign: "center",
                fontFamily: "var(--font-display)",
              }}
            >
              The shop
            </h1>
            <ProductGrid products={products} columns={2} variant="bare" />
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
