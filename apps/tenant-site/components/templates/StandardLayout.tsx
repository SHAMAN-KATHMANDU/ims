import { getTenantContext } from "@/lib/tenant";
import type { TemplateProps } from "./types";
import Link from "next/link";
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
 * a "shop by category" strip on the home page, full blog teaser. The
 * safe choice for most tenants.
 */
export async function StandardLayout(props: TemplateProps) {
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
    <div data-template="standard">
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
            <Hero site={site} host={ctx.host} variant="standard" />
          )}

          {sections.categories && categories.length > 0 && (
            <section
              style={{
                padding: "2rem 0 2.5rem",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <div className="container">
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: "1rem",
                    marginBottom: "1.25rem",
                    flexWrap: "wrap",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "1.25rem",
                      fontFamily: "var(--font-heading)",
                      margin: 0,
                    }}
                  >
                    Shop by category
                  </h2>
                  <Link
                    href="/products"
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--color-muted)",
                    }}
                  >
                    Browse all →
                  </Link>
                </div>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}
                >
                  {categories.slice(0, 10).map((c) => (
                    <Link
                      key={c.id}
                      href={`/products?categoryId=${c.id}`}
                      style={{
                        padding: "0.55rem 1.1rem",
                        borderRadius: 999,
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        fontSize: "0.85rem",
                        color: "var(--color-text)",
                      }}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {sections.products && (
            <section style={{ padding: "var(--section-padding) 0 2rem" }}>
              <div className="container">
                <h2
                  style={{
                    fontSize: "clamp(1.5rem, 2.5vw, 1.875rem)",
                    marginBottom: "2rem",
                    fontFamily: "var(--font-heading)",
                  }}
                >
                  Featured
                </h2>
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
                fontSize: "clamp(2rem, 3.5vw, 2.5rem)",
                fontFamily: "var(--font-heading)",
                marginBottom: "2.5rem",
              }}
            >
              All products
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
