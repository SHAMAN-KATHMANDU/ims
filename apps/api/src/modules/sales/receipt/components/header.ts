/**
 * Receipt header component.
 */
import type PDFDocument from "pdfkit";
import { SPACE } from "../spacing";
import { TYPE } from "../typography";
import { getFontRegular, getFontBold } from "../typography";
import { COLORS } from "../constants";
import type { ReceiptContext } from "../types";

type Doc = InstanceType<typeof PDFDocument>;

export function drawHeader(
  doc: Doc,
  orgName: string,
  saleCode: string,
  locationName: string,
  locationAddress: string,
  ctx: ReceiptContext,
): void {
  doc.fillColor(COLORS.text);

  const textOpts = { lineGap: 0 };
  doc.font(getFontBold()).fontSize(TYPE.title);
  doc.text(orgName, ctx.margin, doc.y, {
    width: ctx.usableWidth,
    align: "center",
    ...textOpts,
  });
  doc.moveDown(SPACE.xxs);

  doc.font(getFontRegular()).fontSize(TYPE.subtitle);
  doc.text(`Receipt #${saleCode}`, ctx.margin, doc.y, {
    width: ctx.usableWidth,
    align: "center",
    ...textOpts,
  });
  doc.moveDown(SPACE.xxs);

  doc.fontSize(TYPE.body);
  doc.text(`Location: ${locationName}`, ctx.margin, doc.y, {
    width: ctx.usableWidth,
    ...textOpts,
  });

  if (locationAddress) {
    doc.fontSize(TYPE.small).fillColor(COLORS.textMuted);
    doc.text(locationAddress, ctx.margin, doc.y + 1, {
      width: ctx.usableWidth,
      ...textOpts,
    });
    doc.fillColor(COLORS.text);
  }

  doc.y += SPACE.sm;
}
