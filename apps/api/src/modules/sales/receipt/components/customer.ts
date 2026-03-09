/**
 * Customer block component - clean format without label prefixes.
 */
import type PDFDocument from "pdfkit";
import { SPACE } from "../spacing";
import { TYPE } from "../typography";
import { getFontRegular } from "../typography";
import { drawSectionTitle } from "../layout";
import { ensureSpace, createPageContext } from "../pagination";
import type { ReceiptContext } from "../types";

type Doc = InstanceType<typeof PDFDocument>;

export function drawCustomer(
  doc: Doc,
  customerName: string,
  customerPhone: string,
  customerAddress: string,
  ctx: ReceiptContext,
): void {
  const pageCtx = createPageContext(ctx);
  const estimatedHeight = 35;
  ensureSpace(doc, estimatedHeight, pageCtx);

  drawSectionTitle(doc, "Customer");

  doc.font(getFontRegular()).fontSize(TYPE.body);

  const textOpts = { lineGap: 0 };
  if (!customerName && !customerPhone) {
    doc.text("Walk-in Customer", ctx.margin, doc.y, textOpts);
  } else {
    if (customerName && customerName !== "Walk-in Customer") {
      doc.text(customerName, ctx.margin, doc.y, textOpts);
      doc.moveDown(SPACE.xxs);
    }
    if (customerPhone) {
      doc.text(customerPhone, ctx.margin, doc.y, textOpts);
      doc.moveDown(SPACE.xxs);
    }
  }

  if (customerAddress) {
    doc.text(customerAddress, ctx.margin, doc.y, {
      width: ctx.usableWidth,
      ...textOpts,
    });
    doc.moveDown(SPACE.xxs);
  }

  doc.moveDown(SPACE.xs);
}
