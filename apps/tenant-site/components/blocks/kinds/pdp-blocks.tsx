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
import { ProductGrid } from "@/components/templates/shared";
import { PdpBuyboxClient } from "./PdpBuyboxClient";
import type { BlockComponentProps } from "../registry";

// ---------- pdp-buybox ------------------------------------------------------

export function PdpBuyboxBlock({
  props,
  dataContext,
}: BlockComponentProps<PdpBuyboxProps>) {
  const product = dataContext.activeProduct;
  if (!product) return null;
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
          marginBottom: "1.25rem",
          fontFamily: "var(--font-heading)",
          lineHeight: 1.15,
        }}
      >
        {product.name}
      </h1>
      <PdpBuyboxClient
        productId={product.id}
        productName={product.name}
        baseUnitPrice={Number(product.finalSp)}
        baseMrp={Number(product.mrp)}
        imageUrl={product.photoUrl ?? null}
        baseSku={product.imsCode}
        variations={product.variations ?? []}
        showSku={props.showSku !== false}
        showVariantPicker={props.showVariantPicker !== false}
        variantDisplay={props.variantDisplay ?? "chips"}
        priceSize={props.priceSize ?? "md"}
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
  if (!product) return null;
  if (!product.description) return null;

  if (props.tabs) {
    const hasSpecs =
      product.length != null ||
      product.breadth != null ||
      product.height != null ||
      product.weight != null;

    return (
      <div style={{ marginTop: "2.5rem" }}>
        {/* Description */}
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

        {/* Specifications */}
        {hasSpecs && (
          <details>
            <summary
              style={{
                padding: "1rem 0",
                fontWeight: 600,
                cursor: "pointer",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              Specifications
            </summary>
            <div style={{ padding: "1.25rem 0" }}>
              <table
                style={{
                  width: "100%",
                  maxWidth: 400,
                  borderCollapse: "collapse",
                  fontSize: "0.9rem",
                }}
              >
                <tbody>
                  {product.length != null && (
                    <tr>
                      <td
                        style={{
                          padding: "0.4rem 1rem 0.4rem 0",
                          color: "var(--color-muted)",
                        }}
                      >
                        Length
                      </td>
                      <td style={{ padding: "0.4rem 0" }}>
                        {product.length} cm
                      </td>
                    </tr>
                  )}
                  {product.breadth != null && (
                    <tr>
                      <td
                        style={{
                          padding: "0.4rem 1rem 0.4rem 0",
                          color: "var(--color-muted)",
                        }}
                      >
                        Breadth
                      </td>
                      <td style={{ padding: "0.4rem 0" }}>
                        {product.breadth} cm
                      </td>
                    </tr>
                  )}
                  {product.height != null && (
                    <tr>
                      <td
                        style={{
                          padding: "0.4rem 1rem 0.4rem 0",
                          color: "var(--color-muted)",
                        }}
                      >
                        Height
                      </td>
                      <td style={{ padding: "0.4rem 0" }}>
                        {product.height} cm
                      </td>
                    </tr>
                  )}
                  {product.weight != null && (
                    <tr>
                      <td
                        style={{
                          padding: "0.4rem 1rem 0.4rem 0",
                          color: "var(--color-muted)",
                        }}
                      >
                        Weight
                      </td>
                      <td style={{ padding: "0.4rem 0" }}>
                        {product.weight} g
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </details>
        )}

        {/* Shipping & Returns */}
        <details>
          <summary
            style={{
              padding: "1rem 0",
              fontWeight: 600,
              cursor: "pointer",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            Shipping &amp; Returns
          </summary>
          <div
            style={{
              padding: "1.25rem 0",
              lineHeight: 1.7,
              color: "var(--color-text)",
              opacity: 0.85,
            }}
          >
            Free shipping on orders over ₹5,000. Returns accepted within 30 days
            of delivery.
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
  node,
  props,
  dataContext,
}: BlockComponentProps<PdpRelatedProps>) {
  const related = (dataContext.relatedProducts ?? []).slice(0, props.limit);
  if (related.length === 0) return null;
  const wrapperHasPadY = node.style?.paddingY !== undefined;
  return (
    <section
      style={{
        padding: wrapperHasPadY ? undefined : "var(--section-padding) 0",
      }}
    >
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
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li
              key={i}
              style={{ display: "inline-flex", alignItems: "center" }}
            >
              {i > 0 && (
                <span aria-hidden="true" style={{ margin: "0 0.5rem" }}>
                  ›
                </span>
              )}
              {c.href ? (
                <Link href={c.href} style={{ color: "inherit" }}>
                  {c.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  style={{ color: "var(--color-text)" }}
                >
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
