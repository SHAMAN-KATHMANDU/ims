/**
 * Page dimensions and colors for receipt PDF.
 */
import { SPACE } from "./spacing";

/** A5: 420 x 595 pt */
export const A5_WIDTH = 420;
export const A5_HEIGHT = 595;
export const MARGIN = 25;
export const USABLE_WIDTH = A5_WIDTH - MARGIN * 2;

/** Footer area: reserved space at bottom of each page */
export const FOOTER_HEIGHT = 50;
export const FOOTER_TOP = A5_HEIGHT - MARGIN - FOOTER_HEIGHT;

/** Minimum space above footer where content can be drawn */
export const PAGE_BOTTOM = FOOTER_TOP - SPACE.xxl;

/** Right edge of table / totals area */
export const TABLE_RIGHT = A5_WIDTH - MARGIN;

/** X position where total values are right-aligned */
export const TOT_X = TABLE_RIGHT - 70;

/** Mid-point for signature block */
export const MID_X = MARGIN + USABLE_WIDTH / 2;

/** Print-friendly grayscale colors. Avoid heavy backgrounds. */
export const COLORS = {
  divider: "#999999",
  text: "#000000",
  textMuted: "#555555",
} as const;
