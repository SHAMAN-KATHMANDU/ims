/**
 * bundle-spotlight — renders a published Bundle (by slug) with its product
 * list and a computed price that honors the bundle's pricingStrategy.
 *
 * Strategies:
 *   SUM          — sum of the included products' finalSp. Shown plainly.
 *   DISCOUNT_PCT — sum minus discountPct. Shown with the original struck.
 *   FIXED        — fixedPrice. Shown with the original sum struck.
 *
 * Falls back to rendering nothing when the slug doesn't resolve to an
 * active bundle so home pages that reference a deleted/disabled bundle
 * degrade silently.
 */

import Link from "next/link";
import { Suspense } from "react";
import type { BundleSpotlightProps } from "@repo/shared";
import { getPublicBundleBySlug } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { getSiteFormatOptions } from "@/lib/format";
import type { BlockComponentProps } from "../registry";

export function BundleSpotlightBlock(
  args: BlockComponentProps<BundleSpotlightProps>,
) {
  const { props } = args;
  if (!props.slug) return null;
  return (
    <Suspense fallback={<BundleSpotlightSkeleton />}>
      <BundleSpotlightInner {...args} />
    </Suspense>
  );
}

function BundleSpotlightSkeleton() {
  return (
    <section style={{ padding: "var(--section-padding) 0" }}>
      <div
        className="container"
        style={{
          display: "grid",
          gap: "2rem",
          gridTemplateColumns: "1fr 1fr",
          alignItems: "center",
        }}
      >
        <div
          aria-hidden
          style={{
            aspectRatio: "4/3",
            background: "var(--color-surface)",
            borderRadius: "var(--radius)",
            animation: "pulse 1.5s infinite",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            aria-hidden
            style={{
              width: "60%",
              height: 28,
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              animation: "pulse 1.5s infinite",
            }}
          />
          <div
            aria-hidden
            style={{
              width: "90%",
              height: 14,
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              animation: "pulse 1.5s infinite",
            }}
          />
        </div>
      </div>
    </section>
  );
}

async function BundleSpotlightInner({
  node,
  props,
  dataContext,
}: BlockComponentProps<BundleSpotlightProps>) {
  const res = await getPublicBundleBySlug(
    dataContext.host,
    dataContext.tenantId,
    props.slug,
  );
  if (!res || res.products.length === 0) return null;

  const { bundle, products } = res;
  const { locale, currency } = getSiteFormatOptions(dataContext.site);
  const fmt = (n: number) => formatPrice(n, { locale, currency });

  const sumTotal = products.reduce((acc, p) => acc + Number(p.finalSp ?? 0), 0);

  let finalTotal = sumTotal;
  if (bundle.pricingStrategy === "DISCOUNT_PCT" && bundle.discountPct != null) {
    finalTotal = sumTotal * (1 - bundle.discountPct / 100);
  } else if (bundle.pricingStrategy === "FIXED" && bundle.fixedPrice != null) {
    finalTotal = bundle.fixedPrice;
  }
  const hasSavings =
    bundle.pricingStrategy !== "SUM" && finalTotal < sumTotal && sumTotal > 0;
  const savingsPct = hasSavings
    ? Math.round((1 - finalTotal / sumTotal) * 100)
    : 0;

  const wrapperHasPadY = node.style?.paddingY !== undefined;
  const layout = props.layout ?? "split";
  const showProducts = props.showProducts ?? true;
  const buttonClass =
    props.buttonStyle === "outline"
      ? "btn btn-outline"
      : props.buttonStyle === "ghost"
        ? "btn btn-ghost"
        : "btn";
  const firstProductId = products[0]?.id;
  const ctaHref =
    props.ctaHref ??
    (firstProductId ? `/products/${firstProductId}` : "/products");
  const ctaLabel = props.ctaLabel ?? "Add bundle to cart";

  return (
    <section
      style={{
        padding: wrapperHasPadY ? undefined : "var(--section-padding) 0",
      }}
    >
      <div
        className={layout === "split" ? "container tpl-stack" : "container"}
        style={{
          display: "grid",
          gridTemplateColumns: layout === "split" ? "1fr 1fr" : "1fr",
          gap: "2.5rem",
          alignItems: "center",
        }}
      >
        <div>
          {props.eyebrow && (
            <div
              style={{
                fontSize: "0.72rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--color-muted)",
                marginBottom: "0.75rem",
              }}
            >
              {props.eyebrow}
            </div>
          )}
          <h2
            style={{
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              fontFamily: "var(--font-display)",
              margin: 0,
              marginBottom: "0.75rem",
            }}
          >
            {props.heading ?? bundle.name}
          </h2>
          {(props.description ?? bundle.description) && (
            <p
              style={{
                color: "var(--color-muted)",
                marginBottom: "1.5rem",
                lineHeight: 1.6,
              }}
            >
              {props.description ?? bundle.description}
            </p>
          )}
          <div
            aria-live="polite"
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.75rem",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "1.75rem",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmt(finalTotal)}
            </span>
            {hasSavings && (
              <>
                <span
                  style={{
                    color: "var(--color-muted)",
                    textDecoration: "line-through",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmt(sumTotal)}
                </span>
                <span
                  style={{
                    color: "var(--color-success)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  Save {savingsPct}%
                </span>
              </>
            )}
          </div>
          <Link href={ctaHref} className={buttonClass}>
            {ctaLabel}
          </Link>
        </div>
        {showProducts && (
          <ul
            aria-label={`Items in ${bundle.name}`}
            style={{
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              padding: "1.5rem",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              background: "var(--color-surface)",
            }}
          >
            {products.map((p) => (
              <li
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  paddingBottom: "0.75rem",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <Link
                  href={`/products/${p.id}`}
                  style={{
                    color: "var(--color-text)",
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </Link>
                <span
                  style={{
                    color: "var(--color-muted)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmt(Number(p.finalSp ?? 0))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
