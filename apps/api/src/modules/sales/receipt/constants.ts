/**
 * Page dimensions and colors for receipt PDF.
 * Optimized for A5 (148mm × 210mm = 420 × 595 pt).
 */
import { SPACE } from "./spacing";

/** A5: 420 × 595 pt (portrait) */
export const A5_WIDTH = 420;
export const A5_HEIGHT = 595;

/** Narrow margins for A5 receipt paper — maximize usable area */
export const MARGIN = 18;
export const USABLE_WIDTH = A5_WIDTH - MARGIN * 2;

/** Compact footer area at bottom of each page */
export const FOOTER_HEIGHT = 38;
export const FOOTER_TOP = A5_HEIGHT - MARGIN - FOOTER_HEIGHT;

/** Content must end above this line (reserves space above footer) */
export const PAGE_BOTTOM = FOOTER_TOP - SPACE.xl;

/** Single-page mode: extend content area to fit ≤10 items on one page */
export function getPageBottom(singlePageMode: boolean): number {
  return singlePageMode ? FOOTER_TOP - 5 : PAGE_BOTTOM;
}

/** Right edge of table / totals area */
export const TABLE_RIGHT = A5_WIDTH - MARGIN;

/** X position where total values are right-aligned */
export const TOT_X = TABLE_RIGHT - 58;

/** Mid-point for signature block */
export const MID_X = MARGIN + USABLE_WIDTH / 2;

/** Divider line thickness for print clarity */
export const DIVIDER_LINE_WIDTH = 0.5;

/** Print-friendly grayscale colors. Avoid heavy backgrounds. */
export const COLORS = {
  divider: "#999999",
  text: "#000000",
  textMuted: "#555555",
} as const;
