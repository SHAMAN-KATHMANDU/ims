/**
 * product-comparison block — 2-4 products side by side with spec rows.
 *
 * Fetches the listed products server-side in parallel. Missing IDs are
 * dropped silently (so admins can hide a product without breaking the
 * comparison). If fewer than two products resolve the block returns
 * null — a single-column table isn't a comparison.
 */

import Link from "next/link";
import { Suspense } from "react";
import type { ProductComparisonProps } from "@repo/shared";
import { getProduct } from "@/lib/api";
import type { PublicProduct } from "@/lib/api";
import { formatPrice, getSiteFormatOptions } from "@/lib/format";
import type { FormatPriceOptions } from "@/lib/format";
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

function renderAttr(
  key: NonNullable<ProductComparisonProps["attributes"]>[number],
  product: PublicProduct,
  formatOpts: FormatPriceOptions,
): React.ReactNode {
  switch (key) {
    case "price":
      return formatPrice(product.finalSp, formatOpts);
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

export function ProductComparisonBlock(
  args: BlockComponentProps<ProductComparisonProps>,
) {
  if (!args.props.productIds || args.props.productIds.length < 2) return null;
  const attrs = args.props.attributes ?? DEFAULT_ATTRIBUTES;
  return (
    <Suspense
      fallback={
        <ProductComparisonSkeleton
          columns={args.props.productIds.length}
          rows={attrs.length}
          wrapperHasPadY={args.node.style?.paddingY !== undefined}
        />
      }
    >
      <ProductComparisonInner {...args} />
    </Suspense>
  );
}

function ProductComparisonSkeleton({
  columns,
  rows,
  wrapperHasPadY,
}: {
  columns: number;
  rows: number;
  wrapperHasPadY: boolean;
}) {
  const cellPulse = {
    background: "var(--color-surface)",
    borderRadius: "var(--radius)",
    animation: "pulse 1.5s infinite",
  } as const;
  return (
    <section
      style={{
        padding: wrapperHasPadY ? undefined : "var(--section-padding) 0",
      }}
    >
      <div className="container">
        <div style={{ overflowX: "auto" }}>
          <table
            aria-hidden
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 520,
            }}
          >
            <thead>
              <tr>
                <th style={{ width: 140, padding: "0.85rem 1rem" }}>&nbsp;</th>
                {Array.from({ length: columns }).map((_, i) => (
                  <th
                    key={i}
                    style={{
                      padding: "0.85rem 1rem",
                      verticalAlign: "top",
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: "1/1",
                        maxWidth: 180,
                        marginBottom: "0.6rem",
                        ...cellPulse,
                      }}
                    />
                    <div style={{ height: 14, width: "70%", ...cellPulse }} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, r) => (
                <tr key={r}>
                  <th
                    style={{
                      padding: "0.75rem 1rem",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <div style={{ height: 10, width: 70, ...cellPulse }} />
                  </th>
                  {Array.from({ length: columns }).map((_, c) => (
                    <td
                      key={c}
                      style={{
                        padding: "0.75rem 1rem",
                        borderBottom: "1px solid var(--color-border)",
                      }}
                    >
                      <div style={{ height: 12, width: "80%", ...cellPulse }} />
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

async function ProductComparisonInner({
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
  const formatOpts = getSiteFormatOptions(dataContext.site);
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
                      {renderAttr(attr, p, formatOpts)}
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
