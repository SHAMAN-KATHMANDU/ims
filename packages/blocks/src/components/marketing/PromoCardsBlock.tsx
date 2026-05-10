import type { PromoCardsProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

/**
 * Render the tenant's currently-active promo codes as a grid or list of
 * cards. Data comes from `dataContext.promos` (server-side fetched from
 * `/public/promos/active`). When no promos are present (empty store or
 * editor preview without seed data), shows a discreet placeholder so the
 * tenant can see where the block lives in the layout.
 */
export function PromoCardsBlock({
  props,
  dataContext,
}: BlockComponentProps<PromoCardsProps>) {
  const promos = dataContext?.promos ?? [];
  const limit = props.limit ?? 12;
  const visible = promos.slice(0, limit);
  const layout = props.layout ?? "grid";
  const columns = props.columns ?? 3;
  const showCode = props.showCode !== false;
  const showValue = props.showValue !== false;

  const containerStyle: React.CSSProperties =
    layout === "grid"
      ? {
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: "1rem",
        }
      : {
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        };

  const cardStyle: React.CSSProperties = {
    border: "1px solid var(--line, #e5e7eb)",
    borderRadius: "var(--radius-md, 8px)",
    padding: "1.25rem",
    background: "var(--bg, #fff)",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  };

  return (
    <section
      style={{
        padding: "var(--section-padding, 3rem) 0",
      }}
    >
      {(props.heading || props.subtitle) && (
        <header
          style={{
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          {props.heading && (
            <h2
              style={{
                margin: 0,
                fontFamily:
                  "var(--font-heading, var(--font-display, sans-serif))",
                fontSize: "2rem",
              }}
            >
              {props.heading}
            </h2>
          )}
          {props.subtitle && (
            <p
              style={{
                margin: "0.5rem 0 0",
                color: "var(--ink-3, #6b7280)",
                fontSize: "1rem",
              }}
            >
              {props.subtitle}
            </p>
          )}
        </header>
      )}

      {visible.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: "var(--ink-3, #6b7280)",
            padding: "2rem 0",
            fontSize: "0.875rem",
            fontStyle: "italic",
          }}
        >
          No active promos right now — check back soon.
        </div>
      ) : (
        <div style={containerStyle}>
          {visible.map((promo) => {
            const valueLabel = formatPromoValue(promo);
            const validity = formatValidity(promo.validFrom, promo.validTo);
            return (
              <article key={promo.id} style={cardStyle}>
                {showValue && valueLabel && (
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 600,
                      color: "var(--accent, #3b82f6)",
                    }}
                  >
                    {valueLabel}
                  </div>
                )}
                {promo.description && (
                  <div style={{ fontSize: "0.95rem" }}>{promo.description}</div>
                )}
                {showCode && (
                  <div
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: "0.875rem",
                      letterSpacing: "0.05em",
                      padding: "0.5rem 0.75rem",
                      background: "var(--bg-elev, #f5f5f5)",
                      borderRadius: "4px",
                      display: "inline-block",
                      width: "fit-content",
                    }}
                  >
                    {promo.code}
                  </div>
                )}
                {validity && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--ink-4, #9ca3af)",
                    }}
                  >
                    {validity}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatPromoValue(promo: {
  valueType: string;
  value: number | string;
}): string | null {
  const value =
    typeof promo.value === "string" ? parseFloat(promo.value) : promo.value;
  if (Number.isNaN(value)) return null;
  if (promo.valueType === "PERCENT") {
    return `${value}% off`;
  }
  // Fall through for FIXED and any other value types.
  return `${value} off`;
}

function formatValidity(
  validFrom?: string | null,
  validTo?: string | null,
): string | null {
  if (!validFrom && !validTo) return null;
  const fmt = (raw: string) => {
    try {
      return new Date(raw).toLocaleDateString();
    } catch {
      return raw;
    }
  };
  if (validFrom && validTo) return `${fmt(validFrom)} – ${fmt(validTo)}`;
  if (validTo) return `Valid until ${fmt(validTo)}`;
  if (validFrom) return `From ${fmt(validFrom)}`;
  return null;
}
