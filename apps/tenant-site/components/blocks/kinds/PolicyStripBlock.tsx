/**
 * PolicyStripBlock — a USP-style strip for shipping / returns / security
 * claims. Similar in spirit to trust-strip but oriented around customer
 * policies with optional icons and per-item links. Typically placed near
 * the footer or above the PDP buybox.
 */

import Link from "next/link";
import type { PolicyStripProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";

const ICON_GLYPH: Record<string, string> = {
  shipping: "🚚",
  returns: "↩",
  secure: "🔒",
  support: "💬",
  warranty: "🛡",
  gift: "🎁",
};

export function PolicyStripBlock({
  props,
}: BlockComponentProps<PolicyStripProps>) {
  const items = props.items ?? [];
  if (items.length === 0) return null;

  const layout = props.layout ?? "inline";
  const columns = props.columns ?? Math.min(4, Math.max(2, items.length));
  const dark = props.dark ?? false;

  const bg = dark ? "var(--color-text)" : "var(--color-surface)";
  const fg = dark ? "var(--color-background)" : "var(--color-text)";
  const muted = dark
    ? "color-mix(in srgb, var(--color-background) 70%, transparent)"
    : "var(--color-muted)";

  return (
    <section
      aria-label={props.heading ?? "Shop policies"}
      style={{
        background: bg,
        color: fg,
        padding: "var(--section-padding) 0",
      }}
    >
      <div className="container">
        {props.heading && (
          <h2
            style={{
              fontSize: "clamp(1.25rem, 2vw, 1.75rem)",
              fontFamily: "var(--font-display)",
              textAlign: "center",
              marginBottom: "2rem",
            }}
          >
            {props.heading}
          </h2>
        )}
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: layout === "grid" ? "grid" : "flex",
            gridTemplateColumns:
              layout === "grid"
                ? `repeat(${columns}, minmax(0, 1fr))`
                : undefined,
            flexWrap: layout === "inline" ? "wrap" : undefined,
            justifyContent: layout === "inline" ? "center" : undefined,
            gap: "1.5rem 2rem",
          }}
        >
          {items.map((item, i) => {
            const body = (
              <>
                {item.icon && (
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: "1.5rem",
                      lineHeight: 1,
                      display: "inline-block",
                    }}
                  >
                    {ICON_GLYPH[item.icon] ?? "•"}
                  </span>
                )}
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                    {item.label}
                  </span>
                  {item.detail && (
                    <span style={{ color: muted, fontSize: "0.82rem" }}>
                      {item.detail}
                    </span>
                  )}
                </span>
              </>
            );
            const cellStyle: React.CSSProperties = {
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: layout === "grid" ? "0.25rem 0" : undefined,
              minHeight: 44,
            };
            return (
              <li key={i} style={cellStyle}>
                {item.href ? (
                  <Link
                    href={item.href}
                    style={{
                      color: "inherit",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
