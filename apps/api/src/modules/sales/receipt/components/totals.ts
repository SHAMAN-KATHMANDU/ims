/**
 * Totals section with divider before total.
 */
import type PDFDocument from "pdfkit";
import { fmtCurrency } from "../utils";
import { drawKeyValueRow, drawDivider } from "../layout";
import { ensureSpace, createPageContext } from "../pagination";
import { SPACE } from "../spacing";
import { TYPE } from "../typography";
import type { ReceiptContext } from "../types";
import type { SaleWithIncludes } from "../types";

type Doc = InstanceType<typeof PDFDocument>;

export function drawTotals(
  doc: Doc,
  sale: SaleWithIncludes,
  ctx: ReceiptContext,
): void {
  const pageCtx = createPageContext(ctx);
  const estimatedHeight = 80;
  ensureSpace(doc, estimatedHeight, pageCtx);

  drawKeyValueRow(doc, "Subtotal", fmtCurrency(sale.subtotal), ctx);

  if (Number(sale.discount) > 0) {
    drawKeyValueRow(doc, "Discount", `-${fmtCurrency(sale.discount)}`, ctx);
  }

  const rawPromo = sale.promoCodesUsed;
  const promoCodes = Array.isArray(rawPromo)
    ? rawPromo.filter((x): x is string => typeof x === "string")
    : [];
  if (promoCodes.length > 0) {
    drawKeyValueRow(doc, "Promo Applied", promoCodes.join(", "), ctx);
  }

  doc.moveDown(SPACE.xs / 8);
  drawDivider(doc, ctx);
  doc.moveDown(SPACE.xs / 8);

  drawKeyValueRow(doc, "TOTAL", fmtCurrency(sale.total), ctx, { bold: true });
  doc.fontSize(TYPE.body);
  doc.moveDown(SPACE.md);
}
