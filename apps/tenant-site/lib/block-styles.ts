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

const GAP_MAP: Record<NonNullable<BlockStyle["gap"]>, string> = {
  none: "0",
  compact: "0.5rem",
  balanced: "1rem",
  spacious: "2rem",
};

const TEXT_SIZE_MAP: Record<NonNullable<BlockStyle["textSize"]>, string> = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
};

const TEXT_WEIGHT_MAP: Record<NonNullable<BlockStyle["textWeight"]>, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

const ITEMS_ALIGN_MAP: Record<NonNullable<BlockStyle["itemsAlign"]>, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
};

const JUSTIFY_MAP: Record<NonNullable<BlockStyle["justify"]>, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
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
  if (style.margin) {
    out.margin = MARGIN_Y_MAP[style.margin];
  }
  if (style.marginY) {
    out.marginTop = MARGIN_Y_MAP[style.marginY];
    out.marginBottom = MARGIN_Y_MAP[style.marginY];
  }
  if (style.marginX) {
    out.marginLeft = MARGIN_Y_MAP[style.marginX];
    out.marginRight = MARGIN_Y_MAP[style.marginX];
  }
  if (style.gap) {
    out.gap = GAP_MAP[style.gap];
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
  if (style.textSize) out.fontSize = TEXT_SIZE_MAP[style.textSize];
  if (style.textWeight) out.fontWeight = TEXT_WEIGHT_MAP[style.textWeight];
  if (style.alignment) out.textAlign = style.alignment;

  // Flex alignment — only take effect when the block wraps children in a flex
  // container. We emit them unconditionally; downstream renderers opt in by
  // applying `display: flex` on the wrapper.
  if (style.itemsAlign) out.alignItems = ITEMS_ALIGN_MAP[style.itemsAlign];
  if (style.justify) out.justifyContent = JUSTIFY_MAP[style.justify];

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
  if (style.fullBleed) {
    out.width = "100vw";
    out.marginLeft = "calc(50% - 50vw)";
    out.marginRight = "calc(50% - 50vw)";
    out.maxWidth = "100vw";
  }

  // Raw color overrides — applied last so they win over token-based values
  if (style.backgroundColor) out.backgroundColor = style.backgroundColor;
  if (style.color) out.color = style.color;

  return out;
}
