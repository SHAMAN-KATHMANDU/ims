/**
 * AccountBarBlock — slim B2B bar above the nav.
 *
 * Server component. Renders nothing for guests unless guestText is set,
 * since the design is "show only when there's something to say". Account
 * + tier identifiers come from a hypothetical `dataContext.viewer`; the
 * tenant-site doesn't currently surface logged-in B2B context, so this
 * renderer is forward-compatible: when viewer is undefined it falls
 * through to guestText (or null).
 */

import type { AccountBarProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";

interface ViewerLike {
  email?: string | null;
  accountNumber?: string | null;
  tierLabel?: string | null;
  poRef?: string | null;
}

export function AccountBarBlock({
  props,
  dataContext,
}: BlockComponentProps<AccountBarProps>) {
  const viewer = (dataContext as unknown as { viewer?: ViewerLike }).viewer;
  const showAccount = props.showAccountNumber ?? true;
  const showTier = props.showTier ?? true;
  const showPo = props.showPo ?? true;
  const alignment = props.alignment ?? "between";
  const tone = props.tone ?? "default";
  const guest = props.guestText;

  if (!viewer && !guest) return null;

  const bg =
    tone === "contrast"
      ? "var(--color-text)"
      : "color-mix(in srgb, var(--color-surface) 80%, transparent)";
  const fg =
    tone === "contrast" ? "var(--color-background)" : "var(--color-text)";
  const muted =
    tone === "contrast"
      ? "color-mix(in srgb, var(--color-background) 70%, transparent)"
      : "var(--color-muted)";

  return (
    <div
      role="region"
      aria-label="Account"
      style={{
        background: bg,
        color: fg,
        borderBottom: "1px solid var(--color-border)",
        fontSize: "0.78rem",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontFamily: "ui-monospace, 'SF Mono', monospace",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          gap: "1.25rem",
          alignItems: "center",
          padding: "0.5rem 0",
          justifyContent:
            alignment === "between" ? "space-between" : "flex-start",
        }}
      >
        {viewer ? (
          <>
            <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
              {showAccount && viewer.accountNumber && (
                <span>
                  <span style={{ color: muted }}>Account </span>
                  <b style={{ fontWeight: 600 }}>{viewer.accountNumber}</b>
                </span>
              )}
              {showTier && viewer.tierLabel && (
                <span>
                  <span style={{ color: muted }}>Tier </span>
                  <b style={{ fontWeight: 600 }}>{viewer.tierLabel}</b>
                </span>
              )}
              {viewer.email && (
                <span style={{ color: muted }}>{viewer.email}</span>
              )}
            </div>
            {showPo && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: muted }}>PO ref</span>
                <span
                  aria-label="PO reference"
                  style={{
                    minWidth: 120,
                    padding: "2px 8px",
                    border: `1px solid ${muted}`,
                    background: "transparent",
                    color: "inherit",
                    fontFamily: "inherit",
                    fontSize: "inherit",
                  }}
                >
                  {viewer.poRef ?? "—"}
                </span>
              </div>
            )}
          </>
        ) : (
          <span style={{ color: muted }}>{guest}</span>
        )}
      </div>
    </div>
  );
}
