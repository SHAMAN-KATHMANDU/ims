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

/**
 * MINIMAL — Clean, fast, type-forward. Wide whitespace, thin type,
 * edge-to-edge hero, single-column product grid.
 */
export async function MinimalLayout(props: TemplateProps) {
  const ctx = await getTenantContext();
  const { page, site, products, categories, activeProduct } = props;

  return (
    <div data-template="minimal">
      <SiteHeader site={site} host={ctx.host} categories={categories} />

      {page === "home" && (
        <>
          <Hero site={site} host={ctx.host} variant="minimal" />
          <section style={{ padding: "3rem 0 5rem" }}>
            <div className="container">
              <ProductGrid products={products} columns={3} />
            </div>
          </section>
        </>
      )}

      {page === "products" && (
        <section style={{ padding: "3rem 0 5rem" }}>
          <div className="container">
            <h1
              style={{
                fontSize: "2rem",
                marginBottom: "2rem",
                letterSpacing: "-0.02em",
              }}
            >
              Products
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
