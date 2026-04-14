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
 * STANDARD — Balanced default. Everything on by default, 4-column grid,
 * categories visible in the hero area, standard type stack.
 */
export async function StandardLayout(props: TemplateProps) {
  const ctx = await getTenantContext();
  const { page, site, products, categories, activeProduct, featuredBlogPosts } =
    props;

  return (
    <div data-template="standard">
      <SiteHeader site={site} host={ctx.host} categories={categories} />

      {page === "home" && (
        <>
          <Hero site={site} host={ctx.host} variant="standard" />
          {categories.length > 0 && (
            <section style={{ padding: "2rem 0" }}>
              <div className="container">
                <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
                  Shop by category
                </h2>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  {categories.slice(0, 8).map((c) => (
                    <span
                      key={c.id}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: 999,
                        background: "rgba(128,128,128,0.1)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}
          <section style={{ padding: "2rem 0 3rem" }}>
            <div className="container">
              <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>
                Featured products
              </h2>
              <ProductGrid products={products} columns={4} />
            </div>
          </section>
          <FeaturedBlogSection posts={featuredBlogPosts ?? []} />
        </>
      )}

      {page === "products" && (
        <section style={{ padding: "3rem 0 5rem" }}>
          <div className="container">
            <h1 style={{ fontSize: "2.25rem", marginBottom: "2rem" }}>
              Products
            </h1>
            <ProductGrid products={products} columns={4} />
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
