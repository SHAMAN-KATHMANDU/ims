/**
 * Notes section - only shown when sale has notes.
 */
import type PDFDocument from "pdfkit";
import { SPACE } from "../spacing";
import { TYPE } from "../typography";
import { getFontRegular } from "../typography";
import { drawSectionTitle } from "../layout";
import { ensureSpace, createPageContext } from "../pagination";
import { truncateWithEllipsis } from "../utils";
import { COLORS } from "../constants";
import type { ReceiptContext } from "../types";
import type { SaleWithIncludes } from "../types";

type Doc = InstanceType<typeof PDFDocument>;

export function drawNotes(
  doc: Doc,
  sale: SaleWithIncludes,
  ctx: ReceiptContext,
): void {
  if (!sale.notes) return;

  const pageCtx = createPageContext(ctx);
  const estimatedHeight = 38;
  ensureSpace(doc, estimatedHeight, pageCtx);

  const notesText = truncateWithEllipsis(sale.notes, 200);
  drawSectionTitle(doc, "Notes");
  doc.font(getFontRegular()).fontSize(TYPE.small).fillColor(COLORS.text);
  doc.text(notesText, ctx.margin, doc.y, {
    width: ctx.usableWidth,
    lineGap: 0,
  });
  doc.moveDown(SPACE.xs);
}
