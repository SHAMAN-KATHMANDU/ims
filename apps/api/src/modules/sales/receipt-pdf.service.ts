/**
 * Receipt PDF generation using PDFKit.
 * Generates a sale receipt PDF from sale data — no file system, returns buffer.
 */

import PDFDocument from "pdfkit";

type SaleWithIncludes = {
  saleCode: string;
  createdAt: Date | string;
  subtotal: unknown;
  discount: unknown;
  total: unknown;
  notes?: string | null;
  location: { id: string; name: string };
  member: { id: string; phone: string; name: string | null } | null;
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

/**
 * Generate a receipt PDF buffer for the given sale.
 */
export async function generateReceiptPdf(
  sale: SaleWithIncludes,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const saleCode = sale.saleCode;
    const createdDate = fmtDate(sale.createdAt);
    const locationName = sale.location?.name ?? "—";
    const customerName = sale.member
      ? `${sale.member.phone}${sale.member.name ? ` (${sale.member.name})` : ""}`
      : "Walk-in Customer";
    const soldBy = sale.createdBy?.username ?? "—";

    // Header
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(`Receipt #${saleCode}`, { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").text(createdDate, { align: "left" });
    doc.moveDown(1);

    // Location & Customer
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Location:", { continued: true });
    doc.font("Helvetica").text(` ${locationName}`);
    doc.font("Helvetica-Bold").text("Sold To:", { continued: true });
    doc.font("Helvetica").text(` ${customerName}`);
    doc.font("Helvetica-Bold").text("Sold By:", { continued: true });
    doc.font("Helvetica").text(` ${soldBy}`);
    doc.moveDown(1);

    // CRM Contact (if present)
    if (sale.contact) {
      const contactName = [sale.contact.firstName, sale.contact.lastName ?? ""]
        .filter(Boolean)
        .join(" ");
      doc.font("Helvetica-Bold").text("CRM Contact:", { continued: true });
      doc.font("Helvetica").text(` ${contactName}`);
      if (sale.contact.phone) {
        doc.font("Helvetica").text(`  Phone: ${sale.contact.phone}`);
      }
      if (sale.contact.email) {
        doc.font("Helvetica").text(`  Email: ${sale.contact.email}`);
      }
      doc.moveDown(1);
    }

    // Items table header
    doc.font("Helvetica-Bold").fontSize(9);
    const col1 = 50;
    const col2 = 250;
    const col3 = 320;
    const col4 = 380;
    const col5 = 460;
    const rowHeight = 16;

    let y = doc.y;
    doc.text("Product", col1, y);
    doc.text("Price", col2, y);
    doc.text("Qty", col3, y);
    doc.text("Disc %", col4, y);
    doc.text("Total", col5, y);
    y += rowHeight;
    doc.moveTo(40, y).lineTo(555, y).stroke();
    y += 6;

    doc.font("Helvetica").fontSize(9);

    for (const item of sale.items ?? []) {
      const productName = item.variation?.product?.name ?? "—";
      const attrs = item.variation?.attributes
        ?.map((a) => a.attributeValue?.value ?? "")
        .filter(Boolean)
        .join(" / ");
      const subName = item.subVariation?.name;
      const line1 =
        productName +
        (attrs ? ` (${attrs})` : "") +
        (subName ? ` - ${subName}` : "");

      if (doc.y + rowHeight * 2 > 750) {
        doc.addPage();
        y = 40;
      }

      doc.text(line1, col1, doc.y, { width: 190, ellipsis: true });
      doc.text(fmtCurrency(item.unitPrice), col2, doc.y);
      doc.text(String(item.quantity), col3, doc.y);
      doc.text(
        Number(item.discountPercent) > 0
          ? `${Number(item.discountPercent).toFixed(1)}%`
          : "-",
        col4,
        doc.y,
      );
      doc.text(fmtCurrency(item.lineTotal), col5, doc.y);
      doc.moveDown(1.2);
    }

    doc.moveDown(1);
    y = doc.y;
    doc.moveTo(40, y).lineTo(555, y).stroke();
    doc.moveDown(0.5);

    // Totals
    doc.font("Helvetica").text("Subtotal:", col4, doc.y, { continued: true });
    doc.text(fmtCurrency(sale.subtotal), col5, doc.y);
    doc.moveDown(0.5);

    if (Number(sale.discount) > 0) {
      doc.text("Discount:", col4, doc.y, { continued: true });
      doc.text(`-${fmtCurrency(sale.discount)}`, col5, doc.y);
      doc.moveDown(0.5);
    }

    doc.font("Helvetica-Bold").text("Total:", col4, doc.y, { continued: true });
    doc.text(fmtCurrency(sale.total), col5, doc.y);
    doc.moveDown(1);

    // Payments
    if (sale.payments && sale.payments.length > 0) {
      doc.font("Helvetica-Bold").text("Payment Methods");
      doc.font("Helvetica");
      for (const p of sale.payments) {
        doc.text(`  ${p.method}: ${fmtCurrency(p.amount)}`);
      }
      doc.moveDown(1);
    }

    if (sale.notes) {
      doc.font("Helvetica-Bold").text("Notes:");
      doc.font("Helvetica").text(sale.notes, { width: 500 });
    }

    doc.end();
  });
}
