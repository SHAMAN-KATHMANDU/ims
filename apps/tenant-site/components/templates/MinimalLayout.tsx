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
 * MINIMAL — Clean, type-forward. Wide whitespace, thin type, small
 * product grid. Centered header, no hero imagery — just the brand name,
 * tagline, and CTA. Best for stores where the product photos do the talking.
 */
export async function MinimalLayout(props: TemplateProps) {
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
    <div data-template="minimal">
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
            <Hero site={site} host={ctx.host} variant="minimal" />
          )}

          {sections.products && (
            <section style={{ padding: "2rem 0 var(--section-padding)" }}>
              <div
                className="container"
                style={{ maxWidth: 1100, margin: "0 auto" }}
              >
                <ProductGrid products={products} columns={3} variant="bare" />
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
          <div
            className="container"
            style={{ maxWidth: 1100, margin: "0 auto" }}
          >
            <h1
              style={{
                fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                fontFamily: "var(--font-heading)",
                letterSpacing: "-0.02em",
                marginBottom: "3rem",
                fontWeight: 500,
              }}
            >
              Everything
            </h1>
            <ProductGrid products={products} columns={3} variant="bare" />
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
