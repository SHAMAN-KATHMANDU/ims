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
 * BOUTIQUE — Warm, story-first. Wider columns, larger imagery, softer
 * separators, a story section above the products.
 */
export async function BoutiqueLayout(props: TemplateProps) {
  const ctx = await getTenantContext();
  const { page, site, products, categories, activeProduct } = props;

  return (
    <div data-template="boutique">
      <SiteHeader site={site} host={ctx.host} categories={categories} />

      {page === "home" && (
        <>
          <Hero site={site} host={ctx.host} variant="boutique" />
          <section style={{ padding: "4rem 0" }}>
            <div
              className="container"
              style={{ maxWidth: 700, textAlign: "center" }}
            >
              <h2 style={{ fontSize: "2rem", marginBottom: "1.5rem" }}>
                Our story
              </h2>
              <p style={{ opacity: 0.8, lineHeight: 1.7 }}>
                Crafted with care, offered with intention. Each piece in this
                shop is chosen for the way it feels, the life it invites, and
                the maker behind it.
              </p>
            </div>
          </section>
          <section style={{ padding: "3rem 0 5rem" }}>
            <div className="container">
              <ProductGrid products={products} columns={3} />
            </div>
          </section>
        </>
      )}

      {page === "products" && (
        <section style={{ padding: "4rem 0" }}>
          <div className="container">
            <h1 style={{ fontSize: "2.5rem", marginBottom: "2rem" }}>
              The shop
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
