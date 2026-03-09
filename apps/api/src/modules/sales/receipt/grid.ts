/**
 * Grid / column system for receipt layout.
 */
import { SPACE } from "./spacing";
import { MARGIN, USABLE_WIDTH } from "./constants";

const GRID = { columns: 12, gutter: SPACE.sm };

/**
 * Compute column position and width.
 * @param span Number of columns to span (1-12)
 * @param startColumn Starting column index (0-based)
 */
export function col(
  span: number,
  startColumn = 0,
): { x: number; width: number } {
  const colWidth =
    (USABLE_WIDTH - (GRID.columns - 1) * GRID.gutter) / GRID.columns;
  const x = MARGIN + startColumn * (colWidth + GRID.gutter);
  const width = span * colWidth + (span - 1) * GRID.gutter;
  return { x, width };
}
