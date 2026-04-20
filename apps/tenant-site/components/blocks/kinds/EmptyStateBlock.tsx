/**
 * EmptyStateBlock — recovery surface for 404, empty-search, empty-cart,
 * or generic no-results contexts. Renders a centered illustration glyph
 * + heading + subtitle + up to two CTAs. Usable from inside `app/**`
 * route fallback files or composed into blueprints via the block tree.
 */

import Link from "next/link";
import type { EmptyStateProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";

const ILLUSTRATION_GLYPH: Record<
  NonNullable<EmptyStateProps["illustration"]>,
  string
> = {
  none: "",
  package: "📦",
  magnifier: "🔎",
  cart: "🛒",
  alert: "⚠",
};

export function EmptyStateBlock({
  props,
}: BlockComponentProps<EmptyStateProps>) {
  const illustration = props.illustration ?? "package";
  const glyph = ILLUSTRATION_GLYPH[illustration];

  return (
    <section
      role="status"
      aria-live="polite"
      style={{
        padding: "clamp(4rem, 10vw, 8rem) 1rem",
        textAlign: "center",
      }}
    >
      <div
        className="container"
        style={{ maxWidth: 520, marginInline: "auto" }}
      >
        {illustration !== "none" && (
          <div
            aria-hidden="true"
            style={{
              fontSize: "clamp(3rem, 8vw, 4.5rem)",
              lineHeight: 1,
              marginBottom: "1.25rem",
              opacity: 0.8,
            }}
          >
            {glyph}
          </div>
        )}
        <h1
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
            fontFamily: "var(--font-display)",
            marginBottom: "0.75rem",
          }}
        >
          {props.heading}
        </h1>
        {props.subtitle && (
          <p
            style={{
              fontSize: "1rem",
              color: "var(--color-muted)",
              marginBottom: "2rem",
              maxWidth: 420,
              marginInline: "auto",
            }}
          >
            {props.subtitle}
          </p>
        )}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {props.ctaLabel && props.ctaHref && (
            <Link
              href={props.ctaHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 44,
                padding: "0 1.4rem",
                background: "var(--color-text)",
                color: "var(--color-background)",
                borderRadius: "var(--radius)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              {props.ctaLabel}
            </Link>
          )}
          {props.secondaryLabel && props.secondaryHref && (
            <Link
              href={props.secondaryHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 44,
                padding: "0 1.4rem",
                background: "transparent",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              {props.secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
