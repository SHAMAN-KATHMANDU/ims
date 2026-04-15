import { getTenantContext } from "@/lib/tenant";
import type { TemplateProps } from "./types";
import {
  SiteHeader,
  ProductGrid,
  ProductDetail,
  ContactBlock,
  SiteFooter,
} from "./shared";
import { FeaturedBlogSection } from "@/components/blog/FeaturedBlogSection";
import { brandingDisplayName, brandingTagline } from "@/lib/theme";

/**
 * BRUTALIST — Monospace, hard edges, exposed grid lines, minimal
 * color. Loud, opinionated, instantly recognizable. For zines, indie
 * streetwear, people with strong opinions. Uses the standard nav
 * variant but wraps the whole thing in a monospace font family.
 */
export async function BrutalistLayout(props: TemplateProps) {
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
    <div
      data-template="brutalist"
      style={{
        fontFamily:
          'ui-monospace, SFMono-Regular, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
      }}
    >
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
                borderBottom: "2px solid var(--color-text)",
                background: "var(--color-background)",
              }}
            >
              <div className="container">
                <div
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: "1.5rem",
                    color: "var(--color-muted)",
                  }}
                >
                  &gt; catalog / v{new Date().getFullYear()}.
                  {String(new Date().getMonth() + 1).padStart(2, "0")}
                </div>
                <h1
                  style={{
                    fontSize: "clamp(3rem, 7vw, 5.5rem)",
                    fontWeight: 900,
                    lineHeight: 0.85,
                    letterSpacing: "-0.04em",
                    textTransform: "uppercase",
                    margin: 0,
                    color: "var(--color-text)",
                  }}
                >
                  {name}.
                </h1>
                {tagline && (
                  <p
                    style={{
                      fontSize: "1rem",
                      marginTop: "2rem",
                      maxWidth: 540,
                      lineHeight: 1.6,
                      color: "var(--color-text)",
                    }}
                  >
                    {tagline}
                  </p>
                )}
                <div
                  style={{
                    marginTop: "2.5rem",
                    display: "flex",
                    gap: "1rem",
                    flexWrap: "wrap",
                    fontSize: "0.85rem",
                  }}
                >
                  <span
                    style={{
                      padding: "0.4rem 0.9rem",
                      border: "2px solid var(--color-text)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    [{String(products.length).padStart(3, "0")}] items
                  </span>
                  <span
                    style={{
                      padding: "0.4rem 0.9rem",
                      border: "2px solid var(--color-text)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {categories.length} categories
                  </span>
                  <span
                    style={{
                      padding: "0.4rem 0.9rem",
                      background: "var(--color-accent)",
                      color: "var(--color-text)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    ★ in stock
                  </span>
                </div>
              </div>
            </section>
          )}

          {sections.products && (
            <section
              style={{
                padding: "var(--section-padding) 0",
                borderBottom: "2px solid var(--color-text)",
              }}
            >
              <div className="container">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "2.5rem",
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  <span>&gt; products</span>
                  <span style={{ color: "var(--color-muted)" }}>
                    sorted_by=newest
                  </span>
                </div>
                <ProductGrid
                  products={products}
                  columns={4}
                  variant="bordered"
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
                fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
                fontWeight: 900,
                textTransform: "uppercase",
                marginBottom: "2rem",
                letterSpacing: "-0.02em",
              }}
            >
              &gt; catalog
            </h1>
            <ProductGrid products={products} columns={4} variant="bordered" />
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
