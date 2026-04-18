/**
 * product-comparison block — 2-4 products side by side with spec rows.
 *
 * Fetches the listed products server-side in parallel. Missing IDs are
 * dropped silently (so admins can hide a product without breaking the
 * comparison). If fewer than two products resolve the block returns
 * null — a single-column table isn't a comparison.
 */

import Link from "next/link";
import type { ProductComparisonProps } from "@repo/shared";
import { getProduct } from "@/lib/api";
import type { PublicProduct } from "@/lib/api";
import { StarRating } from "./StarRating";
import type { BlockComponentProps } from "../registry";

const DEFAULT_ATTRIBUTES: NonNullable<ProductComparisonProps["attributes"]> = [
  "price",
  "category",
  "rating",
  "description",
];

const ATTR_LABEL: Record<
  NonNullable<ProductComparisonProps["attributes"]>[number],
  string
> = {
  price: "Price",
  category: "Category",
  rating: "Rating",
  length: "Length",
  breadth: "Breadth",
  height: "Height",
  weight: "Weight",
  description: "About",
};

function formatPrice(value: string | number | undefined): string {
  if (value == null) return "—";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function renderAttr(
  key: NonNullable<ProductComparisonProps["attributes"]>[number],
  product: PublicProduct,
): React.ReactNode {
  switch (key) {
    case "price":
      return formatPrice(product.finalSp);
    case "category":
      return product.category?.name ?? "—";
    case "rating":
      if (product.avgRating == null || product.ratingCount == null) return "—";
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <StarRating value={product.avgRating} size="sm" hideLabel />
          <span style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
            {product.avgRating.toFixed(1)} ({product.ratingCount})
          </span>
        </span>
      );
    case "length":
      return product.length != null ? `${product.length} cm` : "—";
    case "breadth":
      return product.breadth != null ? `${product.breadth} cm` : "—";
    case "height":
      return product.height != null ? `${product.height} cm` : "—";
    case "weight":
      return product.weight != null ? `${product.weight} g` : "—";
    case "description":
      return (
        <span
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            color: "var(--color-text)",
            opacity: 0.85,
            fontSize: "0.88rem",
          }}
        >
          {product.description ?? "—"}
        </span>
      );
  }
}

export async function ProductComparisonBlock({
  node,
  props,
  dataContext,
}: BlockComponentProps<ProductComparisonProps>) {
  const resolved = await Promise.all(
    props.productIds.map((id) =>
      getProduct(dataContext.host, dataContext.tenantId, id).catch(() => null),
    ),
  );
  const products = resolved.filter(
    (p): p is PublicProduct => p != null && typeof p === "object",
  );
  if (products.length < 2) return null;

  const attrs = props.attributes ?? DEFAULT_ATTRIBUTES;
  const wrapperHasPadY = node.style?.paddingY !== undefined;

  return (
    <section
      style={{
        padding: wrapperHasPadY ? undefined : "var(--section-padding) 0",
      }}
    >
      <div className="container">
        {props.heading && (
          <h2
            style={{
              fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
              fontFamily: "var(--font-display)",
              marginBottom: props.description ? "0.5rem" : "1.75rem",
              textAlign: "center",
            }}
          >
            {props.heading}
          </h2>
        )}
        {props.description && (
          <p
            style={{
              color: "var(--color-muted)",
              marginBottom: "1.75rem",
              textAlign: "center",
              maxWidth: 640,
              marginInline: "auto",
              lineHeight: 1.6,
            }}
          >
            {props.description}
          </p>
        )}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.92rem",
              minWidth: 520,
            }}
          >
            <thead>
              <tr>
                <th
                  scope="col"
                  style={{
                    textAlign: "left",
                    padding: "0.85rem 1rem",
                    borderBottom: "1px solid var(--color-border)",
                    color: "var(--color-muted)",
                    fontSize: "0.78rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontWeight: 600,
                    width: 140,
                  }}
                >
                  &nbsp;
                </th>
                {products.map((p) => (
                  <th
                    key={p.id}
                    scope="col"
                    style={{
                      padding: "0.85rem 1rem",
                      borderBottom: "1px solid var(--color-border)",
                      textAlign: "left",
                      verticalAlign: "top",
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: "1/1",
                        background: "var(--color-surface)",
                        borderRadius: "var(--radius)",
                        overflow: "hidden",
                        marginBottom: "0.6rem",
                        maxWidth: 180,
                      }}
                    >
                      {p.photoUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.photoUrl}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      )}
                    </div>
                    <Link
                      href={`/products/${p.id}`}
                      style={{
                        color: "var(--color-text)",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "0.95rem",
                        lineHeight: 1.3,
                        display: "block",
                      }}
                    >
                      {p.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attrs.map((attr) => (
                <tr key={attr}>
                  <th
                    scope="row"
                    style={{
                      padding: "0.75rem 1rem",
                      borderBottom: "1px solid var(--color-border)",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "var(--color-muted)",
                      fontSize: "0.82rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      verticalAlign: "top",
                    }}
                  >
                    {ATTR_LABEL[attr]}
                  </th>
                  {products.map((p) => (
                    <td
                      key={p.id}
                      style={{
                        padding: "0.75rem 1rem",
                        borderBottom: "1px solid var(--color-border)",
                        verticalAlign: "top",
                      }}
                    >
                      {renderAttr(attr, p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
