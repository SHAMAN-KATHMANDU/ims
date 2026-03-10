/**
 * Totals section with divider before total.
 * Order: Subtotal → Promo Applied (codes + amount) → Product Discount → Total.
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
  const estimatedHeight = 65;
  ensureSpace(doc, estimatedHeight, pageCtx);

  drawKeyValueRow(doc, "Subtotal", fmtCurrency(sale.subtotal), ctx);

  const rawPromo = sale.promoCodesUsed;
  const promoCodes = Array.isArray(rawPromo)
    ? rawPromo.filter((x): x is string => typeof x === "string")
    : [];
  const promoDiscount = Number(sale.promoDiscount ?? 0);

  if (promoCodes.length > 0) {
    drawKeyValueRow(
      doc,
      `Promo (${promoCodes.join(", ")})`,
      `-${fmtCurrency(promoDiscount)}`,
      ctx,
    );
  }

  const productDiscount =
    Number(sale.discount) - Number(sale.promoDiscount ?? 0);
  if (productDiscount > 0) {
    drawKeyValueRow(doc, "Discount", `-${fmtCurrency(productDiscount)}`, ctx);
  }

  doc.moveDown(SPACE.xxs);
  drawDivider(doc, ctx);
  doc.moveDown(SPACE.xxs);

  drawKeyValueRow(doc, "TOTAL", fmtCurrency(sale.total), ctx, { bold: true });
  doc.fontSize(TYPE.body);
  doc.moveDown(SPACE.xs);
}
