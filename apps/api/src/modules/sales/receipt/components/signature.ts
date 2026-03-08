/**
 * Signature block for sold by / received by.
 */
import type PDFDocument from "pdfkit";
import { SPACE } from "../spacing";
import { TYPE } from "../typography";
import { getFontRegular } from "../typography";
import { ensureSpace, createPageContext } from "../pagination";
import type { ReceiptContext } from "../types";

type Doc = InstanceType<typeof PDFDocument>;

export function drawSignatureBlock(doc: Doc, ctx: ReceiptContext): void {
  const pageCtx = createPageContext(ctx);
  const estimatedHeight = 30;
  ensureSpace(doc, estimatedHeight, pageCtx);

  doc.font(getFontRegular()).fontSize(TYPE.body);
  const sigY = doc.y;
  doc.text("Sold By ___________________", ctx.margin, sigY, {
    width: ctx.midX - ctx.margin - SPACE.sm,
  });
  doc.text("Received By ___________________", ctx.midX, sigY, {
    width: ctx.tableRight - ctx.midX - SPACE.sm,
  });
  doc.y = sigY + 18;
}
