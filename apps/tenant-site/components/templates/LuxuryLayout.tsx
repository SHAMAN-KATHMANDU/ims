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

/**
 * LUXURY — Dark, editorial. Serif headings via --font-heading, taller hero,
 * spacious 3-column grid, more chrome.
 */
export async function LuxuryLayout(props: TemplateProps) {
  const ctx = await getTenantContext();
  const { page, site, products, categories, activeProduct, featuredBlogPosts } =
    props;

  return (
    <div data-template="luxury" style={{ background: "var(--bg)" }}>
      <SiteHeader site={site} host={ctx.host} categories={categories} />

      {page === "home" && (
        <>
          <Hero site={site} host={ctx.host} variant="luxury" />
          <section
            style={{
              padding: "5rem 0",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="container">
              <h2
                style={{
                  fontSize: "2.5rem",
                  marginBottom: "3rem",
                  textAlign: "center",
                  letterSpacing: "0.05em",
                }}
              >
                THE COLLECTION
              </h2>
              <ProductGrid products={products} columns={3} />
            </div>
          </section>
          <FeaturedBlogSection posts={featuredBlogPosts ?? []} />
        </>
      )}

      {page === "products" && (
        <section style={{ padding: "5rem 0" }}>
          <div className="container">
            <h1
              style={{
                fontSize: "3rem",
                marginBottom: "3rem",
                textAlign: "center",
                letterSpacing: "0.05em",
              }}
            >
              THE COLLECTION
            </h1>
            <ProductGrid products={products} columns={3} />
          </div>
        </section>
      )}

      {page === "product" && activeProduct && (
        <ProductDetail product={activeProduct} />
      )}

      {page === "contact" && <ContactBlock site={site} />}

      <SiteFooter site={site} host={ctx.host} />
    </div>
  );
}
