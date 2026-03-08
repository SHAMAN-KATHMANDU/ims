/**
 * Reusable layout helpers for receipt PDF.
 */
import type PDFDocument from "pdfkit";
import { COLORS } from "./constants";
import { SPACE } from "./spacing";
import { TYPE } from "./typography";
import { getFontRegular, getFontBold } from "./typography";
import type { ReceiptContext } from "./types";

type Doc = InstanceType<typeof PDFDocument>;

/**
 * Draw a horizontal divider line.
 */
export function drawDivider(doc: Doc, ctx: ReceiptContext, y?: number): void {
  const lineY = y ?? doc.y;
  doc
    .moveTo(ctx.margin, lineY)
    .lineTo(ctx.tableRight, lineY)
    .strokeColor(COLORS.divider)
    .stroke();
  if (y === undefined) {
    doc.y = lineY + SPACE.sm;
  }
}

/**
 * Draw a section title (e.g. "Customer", "Payment").
 */
export function drawSectionTitle(doc: Doc, text: string): void {
  doc
    .font(getFontBold())
    .fontSize(TYPE.section)
    .fillColor(COLORS.text)
    .text(text);
  doc.moveDown(SPACE.xs / 8);
}

const VALUE_COLUMN_WIDTH = 70;

/**
 * Draw a key-value row with label on left, value right-aligned.
 */
export function drawKeyValueRow(
  doc: Doc,
  label: string,
  value: string,
  ctx: ReceiptContext,
  options?: { bold?: boolean },
): void {
  doc
    .font(options?.bold ? getFontBold() : getFontRegular())
    .fontSize(TYPE.body)
    .fillColor(COLORS.text);
  doc.text(label, ctx.margin, doc.y, { continued: true });
  doc.text(value, ctx.totX, doc.y, {
    width: VALUE_COLUMN_WIDTH,
    align: "right",
  });
  doc.moveDown(SPACE.xs / 8);
}
