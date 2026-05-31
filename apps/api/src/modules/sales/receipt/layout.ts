/**
 * Reusable layout helpers for receipt PDF.
 */
import type PDFDocument from "pdfkit";
import { COLORS, DIVIDER_LINE_WIDTH } from "./constants";
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
    .lineWidth(DIVIDER_LINE_WIDTH)
    .moveTo(ctx.margin, lineY)
    .lineTo(ctx.tableRight, lineY)
    .strokeColor(COLORS.divider)
    .stroke()
    .lineWidth(1);
  if (y === undefined) {
    doc.y = lineY + SPACE.xxs;
  }
}

/** Tighter line spacing for receipt text */
const TEXT_OPTS = { lineGap: 0 };

/**
 * Draw a section title (e.g. "Customer", "Payment").
 */
export function drawSectionTitle(doc: Doc, text: string): void {
  doc
    .font(getFontBold())
    .fontSize(TYPE.section)
    .fillColor(COLORS.text)
    .text(text, { ...TEXT_OPTS });
  doc.moveDown(SPACE.xxs);
}

const VALUE_COLUMN_WIDTH = 58;

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
  // Draw label and value as two independently-positioned text calls sharing
  // the same baseline. Using `continued: true` on the label makes PDFKit treat
  // the value as an inline continuation and ignore its x/y + right-align,
  // which silently dropped the value from the rendered output (#586).
  const rowY = doc.y;
  doc.text(label, ctx.margin, rowY, { ...TEXT_OPTS });
  doc.text(value, ctx.totX, rowY, {
    width: VALUE_COLUMN_WIDTH,
    align: "right",
    ...TEXT_OPTS,
  });
  // Restore the cursor to the left margin. The value text call above leaves
  // doc.x at the right-aligned value column, which would otherwise push the
  // next un-positioned text (e.g. a section title) to the right.
  doc.x = ctx.margin;
  doc.moveDown(SPACE.xxs);
}
