/**
 * Pagination helper for receipt PDF.
 */
import type PDFDocument from "pdfkit";
import { SPACE } from "./spacing";
import { MARGIN, PAGE_BOTTOM } from "./constants";
import type { ReceiptContext } from "./types";

export interface PageContext {
  pageBottom: number;
  margin: number;
}

/**
 * Ensure sufficient space remains on the current page.
 * If not, add a new page, reset cursor, and optionally redraw headers.
 */
export function ensureSpace(
  doc: InstanceType<typeof PDFDocument>,
  heightNeeded: number,
  ctx: PageContext,
  options?: { repeatHeader?: () => void },
): void {
  const y = doc.y;
  if (y + heightNeeded > ctx.pageBottom) {
    doc.addPage({ size: "A5", margin: MARGIN });
    doc.y = ctx.margin + SPACE.md;
    options?.repeatHeader?.();
  }
}

export function createPageContext(ctx: ReceiptContext): PageContext {
  return {
    pageBottom: ctx.pageBottom,
    margin: ctx.margin,
  };
}
