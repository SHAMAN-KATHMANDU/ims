/**
 * PDP blocks — server-rendered pieces of the product detail composition.
 * The gallery is a separate file because it needs client-side zoom state.
 *
 * pdp-buybox    — title, price, category, add-to-cart
 * pdp-details   — description (expandable)
 * pdp-related   — "you may also like" grid from relatedProducts
 * breadcrumbs   — home › category › product
 */

import Link from "next/link";
import type {
  BreadcrumbsProps,
  PdpBuyboxProps,
  PdpDetailsProps,
  PdpRelatedProps,
} from "@repo/shared";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { ProductGrid } from "@/components/templates/shared";
import type { BlockComponentProps } from "../registry";

// ---------- pdp-buybox ------------------------------------------------------

export function PdpBuyboxBlock({
  props,
  dataContext,
}: BlockComponentProps<PdpBuyboxProps>) {
  const product = dataContext.activeProduct;
  if (!product) return null;
  const hasDiscount =
    product.finalSp &&
    product.mrp &&
    Number(product.finalSp) < Number(product.mrp);
  return (
    <div>
      {props.showCategory !== false && product.category && (
        <div
          style={{
            color: "var(--color-muted)",
            fontSize: "0.72rem",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: "0.75rem",
          }}
        >
          {product.category.name}
        </div>
      )}
      <h1
        style={{
          fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
          marginBottom: "0.5rem",
          fontFamily: "var(--font-heading)",
          lineHeight: 1.15,
        }}
      >
        {product.name}
      </h1>
      {props.showSku !== false && (
        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--color-muted)",
            marginBottom: "1rem",
            fontFamily: "var(--font-heading)",
            letterSpacing: "0.04em",
          }}
        >
          SKU: {product.imsCode}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "0.75rem",
          fontSize: "1.35rem",
          marginBottom: "2rem",
        }}
      >
        <span style={{ fontWeight: 700 }}>
          ₹{Number(product.finalSp).toLocaleString("en-IN")}
        </span>
        {hasDiscount && (
          <span
            style={{
              textDecoration: "line-through",
              color: "var(--color-muted)",
              fontSize: "1rem",
            }}
          >
            ₹{Number(product.mrp).toLocaleString("en-IN")}
          </span>
        )}
      </div>
      <AddToCartButton
        productId={product.id}
        productName={product.name}
        unitPrice={Number(product.finalSp)}
        imageUrl={product.photoUrl ?? null}
      />
    </div>
  );
}

// ---------- pdp-details -----------------------------------------------------

export function PdpDetailsBlock({
  props,
  dataContext,
}: BlockComponentProps<PdpDetailsProps>) {
  const product = dataContext.activeProduct;
  if (!product || !product.description) return null;
  if (props.tabs) {
    return (
      <div style={{ marginTop: "2.5rem" }}>
        <details open>
          <summary
            style={{
              padding: "1rem 0",
              fontWeight: 600,
              cursor: "pointer",
              borderTop: "1px solid var(--color-border)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            Description
          </summary>
          <div
            style={{
              padding: "1.25rem 0",
              lineHeight: 1.7,
              color: "var(--color-text)",
              opacity: 0.85,
              whiteSpace: "pre-line",
            }}
          >
            {product.description}
          </div>
        </details>
      </div>
    );
  }
  return (
    <div
      style={{
        marginTop: "2.5rem",
        paddingTop: "2rem",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      <h3
        style={{
          fontSize: "0.8rem",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--color-muted)",
          marginBottom: "1rem",
          fontWeight: 600,
        }}
      >
        Description
      </h3>
      <p
        style={{
          lineHeight: 1.7,
          color: "var(--color-text)",
          opacity: 0.85,
          whiteSpace: "pre-line",
          maxWidth: 720,
        }}
      >
        {product.description}
      </p>
    </div>
  );
}

// ---------- pdp-related -----------------------------------------------------

export function PdpRelatedBlock({
  props,
  dataContext,
}: BlockComponentProps<PdpRelatedProps>) {
  const related = (dataContext.relatedProducts ?? []).slice(0, props.limit);
  if (related.length === 0) return null;
  return (
    <section style={{ padding: "var(--section-padding) 0" }}>
      <div className="container">
        <h2
          style={{
            fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
            fontFamily: "var(--font-display)",
            marginBottom: "2rem",
            textAlign: "center",
          }}
        >
          {props.heading ?? "You may also like"}
        </h2>
        <ProductGrid
          products={related}
          columns={props.columns}
          variant="bordered"
        />
      </div>
    </section>
  );
}

// ---------- breadcrumbs -----------------------------------------------------

export function BreadcrumbsBlock({
  props,
  dataContext,
}: BlockComponentProps<BreadcrumbsProps>) {
  const crumbs: { label: string; href?: string }[] = [
    { label: "Home", href: "/" },
  ];
  if (props.scope === "product" && dataContext.activeProduct) {
    const product = dataContext.activeProduct;
    crumbs.push({ label: "Shop", href: "/products" });
    if (product.category) {
      crumbs.push({
        label: product.category.name,
        href: `/products?categoryId=${product.category.id}`,
      });
    }
    crumbs.push({ label: product.name });
  } else if (props.scope === "category") {
    crumbs.push({ label: "Shop" });
  }
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        padding: "1rem 0",
        fontSize: "0.8rem",
        color: "var(--color-muted)",
      }}
    >
      <ol
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.4rem",
          listStyle: "none",
          margin: 0,
          padding: 0,
        }}
      >
        {crumbs.map((c, i) => (
          <li key={i} style={{ display: "inline-flex", alignItems: "center" }}>
            {i > 0 && <span style={{ margin: "0 0.5rem" }}>›</span>}
            {c.href ? (
              <Link href={c.href} style={{ color: "inherit" }}>
                {c.label}
              </Link>
            ) : (
              <span style={{ color: "var(--color-text)" }}>{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
