/**
 * PriceTiersBlock — wholesale / volume pricing table.
 *
 * Server component. Highlights the active tier when a current cart qty
 * is known; otherwise renders a static reference table on the PDP.
 */

import type { PriceTiersProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";
import { formatPrice, getSiteFormatOptions } from "@/lib/format";

export function PriceTiersBlock({
  props,
  dataContext,
}: BlockComponentProps<PriceTiersProps>) {
  const tiers = props.tiers ?? [];
  if (tiers.length === 0) return null;

  const heading = props.heading;
  const footnote = props.footnote;
  const highlightActive = props.highlightActive ?? true;

  const fmt = getSiteFormatOptions(dataContext.site);
  if (props.currency) fmt.currency = props.currency;

  // We don't yet have a cart-line hook on the PDP server render, so the
  // active row is determined by a single tier when there's exactly one
  // (no-op) or left static otherwise. Real cross-cart wiring lives in a
  // future client overlay.
  const activeIndex = -1;

  return (
    <section
      aria-label={heading ?? "Volume pricing"}
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        borderRadius: "var(--radius-card, 0)",
      }}
    >
      {heading && (
        <header
          style={{
            padding: "0.875rem 1rem",
            borderBottom: "1px solid var(--color-border)",
            fontSize: "0.78rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-muted)",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          {heading}
        </header>
      )}
      <table
        role="table"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: "ui-monospace, monospace",
          fontSize: "0.85rem",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <thead>
          <tr>
            <th style={th}>Quantity</th>
            <th style={th}>Tier</th>
            <th style={{ ...th, textAlign: "right" }}>Unit price</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((t, i) => {
            const range =
              t.maxQty === undefined
                ? `${t.minQty}+`
                : t.minQty === t.maxQty
                  ? `${t.minQty}`
                  : `${t.minQty}–${t.maxQty}`;
            const active = highlightActive && i === activeIndex;
            return (
              <tr
                key={`${t.minQty}-${t.maxQty ?? "open"}`}
                style={{
                  background: active
                    ? "color-mix(in srgb, var(--color-primary) 10%, transparent)"
                    : "transparent",
                }}
              >
                <td style={td}>{range}</td>
                <td style={{ ...td, color: "var(--color-muted)" }}>
                  {t.label ?? ""}
                </td>
                <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                  {formatPrice(t.price, fmt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {footnote && (
        <footer
          style={{
            padding: "0.625rem 1rem",
            borderTop: "1px solid var(--color-border)",
            color: "var(--color-muted)",
            fontSize: "0.8rem",
          }}
        >
          {footnote}
        </footer>
      )}
    </section>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "0.625rem 1rem",
  fontSize: "0.7rem",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--color-muted)",
  fontWeight: 500,
  borderBottom: "1px solid var(--color-border)",
};

const td: React.CSSProperties = {
  padding: "0.625rem 1rem",
  borderBottom: "1px solid var(--color-border)",
};
