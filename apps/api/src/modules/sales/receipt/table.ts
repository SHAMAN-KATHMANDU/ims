/**
 * Adaptive table rendering for receipt PDF.
 */
import type PDFDocument from "pdfkit";
import { SPACE } from "./spacing";
import { TYPE } from "./typography";
import { COLORS } from "./constants";
import { getFontRegular, getFontBold } from "./typography";
import { ensureSpace, type PageContext } from "./pagination";
import type { ReceiptContext } from "./types";

type Doc = InstanceType<typeof PDFDocument>;

export interface TableColumn {
  key: string;
  label: string;
  width: number;
  align: "left" | "right";
}

export const ITEMS_TABLE_COLUMNS: TableColumn[] = [
  { key: "product", label: "Product", width: 0.4, align: "left" },
  { key: "price", label: "Price", width: 0.15, align: "right" },
  { key: "qty", label: "Qty", width: 0.1, align: "right" },
  { key: "discountPct", label: "Disc %", width: 0.12, align: "right" },
  { key: "discountAmt", label: "Disc Amt", width: 0.13, align: "right" },
  { key: "total", label: "Total", width: 0.2, align: "right" },
];

const ROW_PADDING = 2;
const HEADER_ROW_HEIGHT = 14;

function computeColumnLayout(
  ctx: ReceiptContext,
): Array<{ x: number; width: number; align: "left" | "right" }> {
  const tableWidth = ctx.tableRight - ctx.margin;
  return ITEMS_TABLE_COLUMNS.map((col, i) => {
    const x =
      ctx.margin +
      ITEMS_TABLE_COLUMNS.slice(0, i).reduce((sum, c) => sum + c.width, 0) *
        tableWidth;
    const width = col.width * tableWidth;
    return { x, width, align: col.align };
  });
}

export function drawTableHeader(
  doc: Doc,
  ctx: ReceiptContext,
  startY: number,
): number {
  const layout = computeColumnLayout(ctx);
  doc.font(getFontBold()).fontSize(TYPE.small).fillColor(COLORS.text);

  let maxY = startY;
  for (let i = 0; i < ITEMS_TABLE_COLUMNS.length; i++) {
    const col = ITEMS_TABLE_COLUMNS[i];
    const { x, width, align } = layout[i];
    doc.text(col.label, x, startY, {
      width: width - 4,
      align,
    });
  }
  maxY = startY + HEADER_ROW_HEIGHT;

  doc
    .moveTo(ctx.margin, maxY + SPACE.xs)
    .lineTo(ctx.tableRight, maxY + SPACE.xs)
    .strokeColor(COLORS.divider)
    .stroke();

  return maxY + SPACE.xs + SPACE.sm;
}

export function drawTableRow(
  doc: Doc,
  row: Record<string, string>,
  ctx: ReceiptContext,
  startY: number,
): number {
  const layout = computeColumnLayout(ctx);
  doc.font(getFontRegular()).fontSize(TYPE.small).fillColor(COLORS.text);

  let maxY = startY;
  const productLayout = layout[0];
  const productText = row.product ?? "—";
  const productWidth = productLayout.width - 4;

  const productHeight = doc.heightOfString(productText, {
    width: productWidth,
  });
  doc.text(productText, productLayout.x, startY, {
    width: productWidth,
    align: "left",
  });
  maxY = Math.max(maxY, startY + productHeight);

  const rowBaseY = startY;
  for (let i = 1; i < ITEMS_TABLE_COLUMNS.length; i++) {
    const col = ITEMS_TABLE_COLUMNS[i];
    const { x, width, align } = layout[i];
    const text = row[col.key] ?? "—";
    doc.text(text, x, rowBaseY, {
      width: width - 4,
      align,
    });
  }

  return maxY + ROW_PADDING;
}
