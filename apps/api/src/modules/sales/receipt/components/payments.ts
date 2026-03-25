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
  const estimatedHeight = 50;
  ensureSpace(doc, estimatedHeight, pageCtx);

  drawSectionTitle(doc, "Payment");

  if (sale.isCreditSale) {
    const amountPaid =
      sale.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
    const balanceDue =
      Math.round((Number(sale.total) - amountPaid) * 100) / 100;

    doc.font(getFontRegular()).fontSize(TYPE.body).fillColor(COLORS.text);
    doc.text("Credit Sale", ctx.margin, doc.y, { lineGap: 0 });
    doc.moveDown(SPACE.xxs);
    drawKeyValueRow(doc, "Amount Paid", fmtCurrency(amountPaid), ctx);
    drawKeyValueRow(doc, "Balance Due", fmtCurrency(balanceDue), ctx);
    doc.moveDown(SPACE.xs);
    return;
  }

  if (sale.payments && sale.payments.length > 0) {
    const settingsRecord =
      sale.tenant?.settings && typeof sale.tenant.settings === "object"
        ? (sale.tenant.settings as Record<string, unknown>)
        : {};
    const configuredMethods = Array.isArray(settingsRecord.paymentMethods)
      ? settingsRecord.paymentMethods
      : [];
    const paymentMethodLabelMap = new Map(
      configuredMethods
        .map((method) =>
          method && typeof method === "object"
            ? (method as Record<string, unknown>)
            : null,
        )
        .filter(
          (
            method,
          ): method is {
            code: string;
            label: string;
          } =>
            method !== null &&
            typeof method.code === "string" &&
            typeof method.label === "string",
        )
        .map((method) => [method.code.toUpperCase(), method.label]),
    );
    for (const p of sale.payments) {
      const methodCode = String(p.method).toUpperCase();
      const method = paymentMethodLabelMap.get(methodCode) ?? methodCode;
      drawKeyValueRow(doc, method, fmtCurrency(p.amount), ctx);
    }
  }

  doc.moveDown(SPACE.xs);
}
