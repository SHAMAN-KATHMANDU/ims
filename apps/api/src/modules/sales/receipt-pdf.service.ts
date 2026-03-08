/**
 * Receipt PDF generation using PDFKit.
 * Generates a sale receipt PDF — A5, org name, To, items, totals, payments, signatures.
 */

import PDFDocument from "pdfkit";

type SaleWithIncludes = {
  saleCode: string;
  createdAt: Date | string;
  subtotal: unknown;
  discount: unknown;
  total: unknown;
  notes?: string | null;
  isCreditSale?: boolean;
  promoCodesUsed?: string[] | unknown | null;
  tenant?: { name: string } | null;
  location?:
    | { id: string; name: string; address?: string | null }
    | { id: string; name: string };
  member?: {
    id: string;
    phone: string;
    name?: string | null;
    address?: string | null;
  } | null;
  createdBy: { id: string; username: string; role?: string };
  contact?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  payments?: Array<{
    id: string;
    method: string;
    amount: unknown;
    createdAt?: Date;
  }>;
  items?: Array<{
    id: string;
    quantity: number;
    unitPrice: unknown;
    discountPercent: unknown;
    discountAmount?: unknown;
    lineTotal: unknown;
    variation: {
      product: { id: string; name: string; category?: { name: string } | null };
      attributes?: Array<{
        attributeType: { name: string };
        attributeValue: { value: string };
      }>;
    };
    subVariation?: { id: string; name: string } | null;
  }>;
};

function fmtCurrency(value: unknown): string {
  const n = Number(value);
  if (Number.isNaN(n)) return "0.00";
  return n.toFixed(2);
}

function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** A5: 420 x 595 pt. With 25pt margin, usable width ~370. */
const A5_WIDTH = 420;
const MARGIN = 25;
const USABLE_WIDTH = A5_WIDTH - MARGIN * 2;

/**
 * Generate a receipt PDF buffer for the given sale.
 */
export async function generateReceiptPdf(
  sale: SaleWithIncludes,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      margin: MARGIN,
      size: "A5",
      bufferPages: true,
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const orgName = sale.tenant?.name ?? "—";
    const saleCode = sale.saleCode;
    const createdDate = fmtDate(sale.createdAt);
    const locationName =
      (sale.location && "name" in sale.location ? sale.location.name : null) ??
      "—";
    const locationAddress =
      sale.location && "address" in sale.location
        ? (sale.location.address ?? "")
        : "";

    const customerName = sale.member
      ? `${sale.member.phone}${sale.member.name ? ` (${sale.member.name})` : ""}`
      : sale.contact
        ? [sale.contact.firstName, sale.contact.lastName ?? ""]
            .filter(Boolean)
            .join(" ")
        : "Walk-in Customer";
    const customerAddress = sale.member?.address ?? "";
    const soldBy = sale.createdBy?.username ?? "—";

    // Header
    doc.fontSize(14).font("Helvetica-Bold").text(orgName, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").text(`Receipt #${saleCode}`, {
      align: "center",
    });
    doc.text(createdDate, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(9).text(`Location: ${locationName}`, { align: "left" });
    if (locationAddress) {
      doc.fontSize(8).text(locationAddress, { align: "left" });
    }
    doc.moveDown(1);

    // To block
    doc.fontSize(9).font("Helvetica-Bold").text("To:", { align: "left" });
    doc.font("Helvetica").text(customerName);
    if (customerAddress) {
      doc.fontSize(8).text(customerAddress);
    }
    doc.moveDown(1);

    // Items table (manual layout for A5)
    const colW = [120, 45, 22, 38, 48, 52];
    const colX = [
      MARGIN,
      MARGIN + colW[0],
      MARGIN + colW[0] + colW[1],
      MARGIN + colW[0] + colW[1] + colW[2],
      MARGIN + colW[0] + colW[1] + colW[2] + colW[3],
      MARGIN + colW[0] + colW[1] + colW[2] + colW[3] + colW[4],
    ];
    const rowH = 14;
    const pageBottom = 595 - MARGIN - 60;
    const tableRight = MARGIN + colW.reduce((a, b) => a + b, 0);

    doc.font("Helvetica-Bold").fontSize(8);
    let y = doc.y;
    doc.text("Product", colX[0], y);
    doc.text("Price", colX[1], y);
    doc.text("Qty", colX[2], y);
    doc.text("Disc%", colX[3], y);
    doc.text("Disc Amt", colX[4], y);
    doc.text("Total", colX[5], y);
    y += rowH;
    doc.moveTo(MARGIN, y).lineTo(tableRight, y).stroke();
    y += 6;

    doc.font("Helvetica").fontSize(8);

    for (const item of sale.items ?? []) {
      if (y + rowH > pageBottom) {
        doc.addPage({ size: "A5", margin: MARGIN });
        y = MARGIN + 20;
      }

      const productName = item.variation?.product?.name ?? "—";
      const attrs = item.variation?.attributes
        ?.map((a) => a.attributeValue?.value ?? "")
        .filter(Boolean)
        .join(" / ");
      const subName = item.subVariation?.name;
      const product =
        productName +
        (attrs ? ` (${attrs})` : "") +
        (subName ? ` - ${subName}` : "");

      doc.text(product, colX[0], y, { width: colW[0] - 4 });
      doc.text(fmtCurrency(item.unitPrice), colX[1], y);
      doc.text(String(item.quantity), colX[2], y);
      doc.text(
        Number(item.discountPercent) > 0
          ? `${Number(item.discountPercent).toFixed(1)}%`
          : "-",
        colX[3],
        y,
      );
      doc.text(
        Number(item.discountAmount ?? 0) > 0
          ? fmtCurrency(item.discountAmount)
          : "-",
        colX[4],
        y,
      );
      doc.text(fmtCurrency(item.lineTotal), colX[5], y);
      y += rowH + 2;
    }

    doc.y = y + 6;
    doc.moveTo(MARGIN, doc.y).lineTo(tableRight, doc.y).stroke();
    doc.moveDown(0.5);

    // Totals
    const totX = tableRight - 55;
    doc.font("Helvetica").fontSize(9);
    doc.text("Subtotal:", MARGIN, doc.y, { continued: true });
    doc.text(fmtCurrency(sale.subtotal), totX, doc.y);
    doc.moveDown(0.4);

    if (Number(sale.discount) > 0) {
      doc.text("Discount:", MARGIN, doc.y, { continued: true });
      doc.text(`-${fmtCurrency(sale.discount)}`, totX, doc.y);
      doc.moveDown(0.4);
    }

    const rawPromo = sale.promoCodesUsed;
    const promoCodes = Array.isArray(rawPromo)
      ? rawPromo.filter((x): x is string => typeof x === "string")
      : [];
    if (promoCodes.length > 0) {
      doc.text("Promo applied:", MARGIN, doc.y, { continued: true });
      doc.text(promoCodes.join(", "), totX, doc.y);
      doc.moveDown(0.4);
    }

    doc.font("Helvetica-Bold");
    doc.text("Total:", MARGIN, doc.y, { continued: true });
    doc.text(fmtCurrency(sale.total), totX, doc.y);
    doc.moveDown(1);

    // Payment block
    doc.font("Helvetica-Bold").fontSize(9).text("Payment", { align: "left" });
    doc.font("Helvetica").fontSize(9);

    if (sale.isCreditSale) {
      const amountPaid =
        sale.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
      const balanceDue =
        Math.round((Number(sale.total) - amountPaid) * 100) / 100;
      doc.text("Credit Sale", { align: "left" });
      doc.text(`Amount Paid: ${fmtCurrency(amountPaid)}`);
      doc.text(`Balance Due: ${fmtCurrency(balanceDue)}`);
    }

    if (sale.payments && sale.payments.length > 0) {
      const paidUsing = sale.payments
        .map((p) => `${p.method} ${fmtCurrency(p.amount)}`)
        .join(", ");
      doc.text(`Paid Using: ${paidUsing}`);
    }
    doc.moveDown(1);

    // Signature block
    doc.fontSize(9).font("Helvetica");
    doc.text("Received By _________________________");
    doc.moveDown(0.5);
    doc.text(`Sold By _________________________ (${soldBy})`);
    doc.moveDown(1);

    if (sale.notes) {
      doc.font("Helvetica-Bold").text("Notes:", { align: "left" });
      doc.font("Helvetica").fontSize(8).text(sale.notes, {
        width: USABLE_WIDTH,
      });
      doc.moveDown(1);
    }

    // Footer: page numbers and "Generated by Shamanyantra"
    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).font("Helvetica");
      doc.text(
        "Generated by Shamanyantra (for reference)",
        MARGIN,
        doc.page.height - MARGIN - 20,
        { align: "center", width: USABLE_WIDTH },
      );
      doc.text(
        `Page ${i + 1} of ${totalPages}`,
        MARGIN,
        doc.page.height - MARGIN - 12,
        { align: "center", width: USABLE_WIDTH },
      );
    }

    doc.end();
  });
}
