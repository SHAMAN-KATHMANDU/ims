/**
 * Footer with timestamp, processed by, system name, page number.
 */
import type PDFDocument from "pdfkit";
import { SPACE } from "../spacing";
import { TYPE } from "../typography";
import { getFontRegular, getFontBold } from "../typography";
import { COLORS } from "../constants";
import type { ReceiptContext } from "../types";

type Doc = InstanceType<typeof PDFDocument>;

const FOOTER_LINE_HEIGHT = 7;

export function drawFooter(
  doc: Doc,
  createdDate: string,
  processedBy: string,
  pageIndex: number,
  totalPages: number,
  ctx: ReceiptContext,
): void {
  const y = ctx.footerTop;

  doc.font(getFontRegular()).fontSize(TYPE.tiny).fillColor(COLORS.text);
  doc.text(createdDate, ctx.margin, y, {
    width: ctx.usableWidth,
    align: "center",
  });

  doc.font(getFontBold()).fontSize(TYPE.small);
  doc.text(`Processed by ${processedBy}`, ctx.margin, y + FOOTER_LINE_HEIGHT, {
    width: ctx.usableWidth,
    align: "center",
  });

  doc.font(getFontRegular()).fontSize(TYPE.tiny);
  doc.text("Shamanyantra POS", ctx.margin, y + FOOTER_LINE_HEIGHT * 2, {
    width: ctx.usableWidth,
    align: "center",
  });

  doc.text(
    `Page ${pageIndex + 1} / ${totalPages}`,
    ctx.margin,
    y + FOOTER_LINE_HEIGHT * 3,
    {
      width: ctx.usableWidth,
      align: "center",
    },
  );
}
