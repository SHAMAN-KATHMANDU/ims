/**
 * Payment section - structured list of payment methods.
 */
import type PDFDocument from "pdfkit";
import { fmtCurrency } from "../utils";
import { drawSectionTitle, drawKeyValueRow } from "../layout";
import { ensureSpace, createPageContext } from "../pagination";
import { SPACE } from "../spacing";
import { TYPE } from "../typography";
import { getFontRegular } from "../typography";
import { COLORS } from "../constants";
import type { ReceiptContext } from "../types";
import type { SaleWithIncludes } from "../types";

type Doc = InstanceType<typeof PDFDocument>;

export function drawPayments(
  doc: Doc,
  sale: SaleWithIncludes,
  ctx: ReceiptContext,
): void {
  const pageCtx = createPageContext(ctx);
  const estimatedHeight = 80;
  ensureSpace(doc, estimatedHeight, pageCtx);

  drawSectionTitle(doc, "Payment");

  if (sale.isCreditSale) {
    const amountPaid =
      sale.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
    const balanceDue =
      Math.round((Number(sale.total) - amountPaid) * 100) / 100;

    doc.font(getFontRegular()).fontSize(TYPE.body).fillColor(COLORS.text);
    doc.text("Credit Sale", ctx.margin);
    doc.moveDown(SPACE.xs / 8);
    drawKeyValueRow(doc, "Amount Paid", fmtCurrency(amountPaid), ctx);
    drawKeyValueRow(doc, "Balance Due", fmtCurrency(balanceDue), ctx);
    doc.moveDown(SPACE.sm);
    return;
  }

  if (sale.payments && sale.payments.length > 0) {
    for (const p of sale.payments) {
      const method = String(p.method).toUpperCase();
      drawKeyValueRow(doc, method, fmtCurrency(p.amount), ctx);
    }
  }

  doc.moveDown(SPACE.md);
}
