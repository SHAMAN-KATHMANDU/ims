/**
 * Receipt header component.
 */
import type PDFDocument from "pdfkit";
import { SPACE } from "../spacing";
import { TYPE } from "../typography";
import { getFontRegular, getFontBold } from "../typography";
import { truncateWithEllipsis } from "../utils";
import { COLORS } from "../constants";
import type { ReceiptContext } from "../types";
import type { TenantBusinessProfile } from "@prisma/client";

type Doc = InstanceType<typeof PDFDocument>;

/**
 * Compose a single comma-joined address line from the business profile.
 * Skips null/empty parts.
 */
function composeAddress(p: TenantBusinessProfile | null): string {
  if (!p) return "";
  const parts = [
    p.addressLine1,
    p.addressLine2,
    p.city,
    [p.state, p.postalCode].filter(Boolean).join(" "),
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

export function drawHeader(
  doc: Doc,
  orgName: string,
  saleCode: string,
  locationName: string,
  locationAddress: string,
  ctx: ReceiptContext,
  businessProfile: TenantBusinessProfile | null = null,
): void {
  doc.fillColor(COLORS.text);

  const textOpts = { lineGap: 0 };
  doc.font(getFontBold()).fontSize(TYPE.title);
  doc.text(truncateWithEllipsis(orgName, 60), ctx.margin, doc.y, {
    width: ctx.usableWidth,
    align: "center",
    ...textOpts,
  });
  doc.moveDown(SPACE.xxs);

  // Optional business identity sub-header — address, phone, tax IDs.
  // Centered, small, muted; skipped entirely when no profile or no fields.
  doc.font(getFontRegular()).fontSize(TYPE.small).fillColor(COLORS.textMuted);
  const businessAddress = composeAddress(businessProfile);
  if (businessAddress) {
    doc.text(truncateWithEllipsis(businessAddress, 120), ctx.margin, doc.y, {
      width: ctx.usableWidth,
      align: "center",
      ...textOpts,
    });
  }
  if (businessProfile?.phone) {
    doc.text(`Phone: ${businessProfile.phone}`, ctx.margin, doc.y, {
      width: ctx.usableWidth,
      align: "center",
      ...textOpts,
    });
  }
  const taxBits: string[] = [];
  if (businessProfile?.panNumber)
    taxBits.push(`PAN: ${businessProfile.panNumber}`);
  if (businessProfile?.vatNumber)
    taxBits.push(`VAT: ${businessProfile.vatNumber}`);
  if (taxBits.length > 0) {
    doc.text(taxBits.join("  ·  "), ctx.margin, doc.y, {
      width: ctx.usableWidth,
      align: "center",
      ...textOpts,
    });
  }
  doc.fillColor(COLORS.text);
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
    doc.text(
      truncateWithEllipsis(locationAddress, 100),
      ctx.margin,
      doc.y + 1,
      {
        width: ctx.usableWidth,
        ...textOpts,
      },
    );
    doc.fillColor(COLORS.text);
  }

  doc.y += SPACE.sm;
}
