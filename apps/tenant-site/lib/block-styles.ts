/**
 * applyBlockStyles — translate a BlockStyle override into the
 * React.CSSProperties object the BlockRenderer applies to the outer
 * wrapper of every block.
 *
 * Every BlockStyle field is an enum token (not a raw px/rem) so every
 * tenant theme renders the same scale the same way. The translator
 * reads theme-wide values off CSS variables set by themeTokensToCssVars,
 * so a block styled `shadow: "md"` automatically picks up whatever
 * shadow the tenant's palette dictates.
 *
 * Absent fields contribute zero properties — legacy block trees with
 * no `node.style` render identically to before.
 */

import type { BlockStyle } from "@repo/shared";

// ---------------------------------------------------------------------------
// Scale → value maps
// ---------------------------------------------------------------------------

const PADDING_Y_MAP: Record<NonNullable<BlockStyle["paddingY"]>, string> = {
  none: "0",
  compact: "2rem",
  balanced: "var(--section-padding)",
  spacious: "calc(var(--section-padding) * 1.75)",
};

const PADDING_X_MAP: Record<NonNullable<BlockStyle["paddingX"]>, string> = {
  none: "0",
  compact: "1rem",
  balanced: "1.5rem",
  spacious: "2.5rem",
};

const MARGIN_Y_MAP: Record<NonNullable<BlockStyle["marginY"]>, string> = {
  none: "0",
  sm: "1rem",
  md: "2rem",
  lg: "3rem",
};

const MAX_WIDTH_MAP: Record<NonNullable<BlockStyle["maxWidth"]>, string> = {
  narrow: "640px",
  default: "1200px",
  wide: "1440px",
  full: "100%",
};

const MIN_HEIGHT_MAP: Record<NonNullable<BlockStyle["minHeight"]>, string> = {
  auto: "auto",
  sm: "200px",
  md: "400px",
  lg: "600px",
  screen: "100vh",
};

const RADIUS_MAP: Record<NonNullable<BlockStyle["borderRadius"]>, string> = {
  none: "0",
  sm: "4px",
  md: "8px",
  lg: "16px",
  full: "9999px",
};

const SHADOW_MAP: Record<NonNullable<BlockStyle["shadow"]>, string> = {
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)",
  md: "0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)",
  lg: "0 20px 25px -5px rgba(0,0,0,0.10), 0 8px 10px -6px rgba(0,0,0,0.08)",
};

const BORDER_TONE_VAR: Record<NonNullable<BlockStyle["borderTone"]>, string> = {
  subtle: "var(--color-border)",
  strong: "var(--color-text)",
  accent: "var(--color-accent)",
};

const OVERLAY_FILL: Record<
  NonNullable<BlockStyle["backgroundOverlay"]>,
  string | null
> = {
  none: null,
  light: "rgba(255,255,255,0.35)",
  dark: "rgba(0,0,0,0.4)",
  brand: "color-mix(in srgb, var(--color-primary) 35%, transparent)",
};

// ---------------------------------------------------------------------------
// Translator
// ---------------------------------------------------------------------------

/**
 * Translate a BlockStyle override to inline CSS. Returns an empty
 * object when `style` is undefined. Designed to be spread onto the
 * block wrapper's `style` prop — it does not mutate `style`.
 */
export function applyBlockStyles(
  style: BlockStyle | undefined,
): React.CSSProperties {
  if (!style) return {};
  const out: React.CSSProperties = {};

  // Spacing
  if (style.paddingY && style.paddingX) {
    out.padding = `${PADDING_Y_MAP[style.paddingY]} ${PADDING_X_MAP[style.paddingX]}`;
  } else if (style.paddingY) {
    out.paddingTop = PADDING_Y_MAP[style.paddingY];
    out.paddingBottom = PADDING_Y_MAP[style.paddingY];
  } else if (style.paddingX) {
    out.paddingLeft = PADDING_X_MAP[style.paddingX];
    out.paddingRight = PADDING_X_MAP[style.paddingX];
  }
  if (style.marginY) {
    out.marginTop = MARGIN_Y_MAP[style.marginY];
    out.marginBottom = MARGIN_Y_MAP[style.marginY];
  }

  // Background — overlay stacks over image (or over a color token).
  const overlayFill = style.backgroundOverlay
    ? OVERLAY_FILL[style.backgroundOverlay]
    : null;
  if (style.backgroundImage) {
    const overlay = overlayFill
      ? `linear-gradient(${overlayFill}, ${overlayFill}), `
      : "";
    out.background = `${overlay}url("${style.backgroundImage}") center/cover no-repeat`;
  } else if (style.backgroundToken) {
    if (overlayFill) {
      out.background = `linear-gradient(${overlayFill}, ${overlayFill}), var(--${style.backgroundToken})`;
    } else {
      out.background = `var(--${style.backgroundToken})`;
    }
  } else if (overlayFill) {
    out.background = overlayFill;
  }

  // Text
  if (style.textToken) out.color = `var(--${style.textToken})`;
  if (style.alignment) out.textAlign = style.alignment;

  // Border / surface
  if (typeof style.borderWidth === "number" && style.borderWidth > 0) {
    out.borderWidth = `${style.borderWidth}px`;
    out.borderStyle = "solid";
    out.borderColor = BORDER_TONE_VAR[style.borderTone ?? "subtle"];
  }
  if (style.borderRadius) out.borderRadius = RADIUS_MAP[style.borderRadius];
  if (style.shadow && style.shadow !== "none") {
    out.boxShadow = SHADOW_MAP[style.shadow];
  }

  // Layout envelope
  if (style.maxWidth) {
    out.maxWidth = MAX_WIDTH_MAP[style.maxWidth];
    if (style.maxWidth !== "full") out.marginInline = "auto";
  }
  if (style.minHeight && style.minHeight !== "auto") {
    out.minHeight = MIN_HEIGHT_MAP[style.minHeight];
  }

  return out;
}
