/**
 * Receipt PDF generation using PDFKit.
 * A5 paper, professional layout, print-friendly, proper alignment and casing.
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
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

/** Print-friendly grayscale colors */
const COLORS = {
  headerBg: "#f5f5f5",
  tableHeaderBg: "#ebebeb",
  divider: "#cccccc",
  text: "#000000",
  textMuted: "#555555",
} as const;

/** A5: 420 x 595 pt. */
const A5_WIDTH = 420;
const A5_HEIGHT = 595;
const MARGIN = 25;
const USABLE_WIDTH = A5_WIDTH - MARGIN * 2;
const TABLE_RIGHT = MARGIN + 325; // total table width
const TOT_X = TABLE_RIGHT - 55;
const MID_X = MARGIN + USABLE_WIDTH / 2;
const FOOTER_TOP = A5_HEIGHT - MARGIN - 50;
const ROW_H = 14;
const PAGE_BOTTOM = FOOTER_TOP - 80;

/** Column widths: Product, Price, Qty, Disc %, Disc Amt, Total */
const COL_W = [115, 45, 22, 38, 48, 57];
const COL_X = [
  MARGIN,
  MARGIN + COL_W[0],
  MARGIN + COL_W[0] + COL_W[1],
  MARGIN + COL_W[0] + COL_W[1] + COL_W[2],
  MARGIN + COL_W[0] + COL_W[1] + COL_W[2] + COL_W[3],
  MARGIN + COL_W[0] + COL_W[1] + COL_W[2] + COL_W[3] + COL_W[4],
];

function drawHeader(
  doc: InstanceType<typeof PDFDocument>,
  orgName: string,
  saleCode: string,
  locationName: string,
  locationAddress: string,
) {
  const headerH = 42;
  doc
    .rect(MARGIN, MARGIN, USABLE_WIDTH, headerH)
    .fill(COLORS.headerBg);
  doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(16);
  doc.text(orgName, MARGIN + 8, MARGIN + 8, {
    width: USABLE_WIDTH - 16,
    align: "center",
  });
  doc.font("Helvetica").fontSize(10);
  doc.text(`Receipt #${saleCode}`, MARGIN + 8, MARGIN + 22, {
    width: USABLE_WIDTH - 16,
    align: "center",
  });
  doc.fontSize(9);
  doc.text(`Location: ${locationName}`, MARGIN + 8, MARGIN + 32, {
    width: USABLE_WIDTH - 16,
  });
  if (locationAddress) {
    doc.fontSize(8).fillColor(COLORS.textMuted);
    doc.text(locationAddress, MARGIN + 8, doc.y + 2, {
      width: USABLE_WIDTH - 16,
    });
    doc.fillColor(COLORS.text);
  }
  doc.y = MARGIN + headerH + 12;
}

function drawToBlock(
  doc: InstanceType<typeof PDFDocument>,
  customerName: string,
  customerPhone: string,
  customerAddress: string,
) {
  doc.font("Helvetica-Bold").fontSize(10).text("To:", MARGIN, doc.y);
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(9);
  if (customerName && customerName !== "Walk-in Customer") {
    doc.text(`Name: ${customerName}`, MARGIN + 8, doc.y);
    doc.moveDown(0.3);
  }
  if (customerPhone) {
    doc.text(`Phone: ${customerPhone}`, MARGIN + 8, doc.y);
    doc.moveDown(0.3);
  }
  if (!customerName && !customerPhone) {
    doc.text("Walk-in Customer", MARGIN + 8, doc.y);
    doc.moveDown(0.3);
  }
  if (customerAddress) {
    doc.text(`Address: ${customerAddress}`, MARGIN + 8, doc.y, {
      width: USABLE_WIDTH - 16,
    });
    doc.moveDown(0.3);
  }
  doc.moveDown(0.5);
}

function drawItemsTable(doc: InstanceType<typeof PDFDocument>, sale: SaleWithIncludes) {
  const headers = ["Product", "Price", "Qty", "Disc %", "Disc Amt", "Total"];
  let y = doc.y;

  // Header row with gray background
  doc
    .rect(MARGIN, y - 2, TABLE_RIGHT - MARGIN, ROW_H + 4)
    .fill(COLORS.tableHeaderBg);
  doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(8);
  doc.text(headers[0], COL_X[0], y);
  for (let i = 1; i < headers.length; i++) {
    doc.text(headers[i], COL_X[i], y, {
      width: COL_W[i],
      align: i >= 1 ? "right" : "left",
    });
  }
  y += ROW_H + 6;
  doc.moveTo(MARGIN, y).lineTo(TABLE_RIGHT, y).strokeColor(COLORS.divider).stroke();
  y += 6;

  doc.font("Helvetica").fontSize(8);

  for (const item of sale.items ?? []) {
    if (y + ROW_H > PAGE_BOTTOM) {
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

    doc.text(product, COL_X[0], y, { width: COL_W[0] - 4 });
    doc.text(fmtCurrency(item.unitPrice), COL_X[1], y, {
      width: COL_W[1],
      align: "right",
    });
    doc.text(String(item.quantity), COL_X[2], y, {
      width: COL_W[2],
      align: "right",
    });
    doc.text(
      Number(item.discountPercent) > 0
        ? `${Number(item.discountPercent).toFixed(1)}%`
        : "-",
      COL_X[3],
      y,
      { width: COL_W[3], align: "right" },
    );
    doc.text(
      Number(item.discountAmount ?? 0) > 0
        ? fmtCurrency(item.discountAmount)
        : "-",
      COL_X[4],
      y,
      { width: COL_W[4], align: "right" },
    );
    doc.text(fmtCurrency(item.lineTotal), COL_X[5], y, {
      width: COL_W[5],
      align: "right",
    });
    y += ROW_H + 2;
  }

  doc.y = y + 6;
  doc.moveTo(MARGIN, doc.y).lineTo(TABLE_RIGHT, doc.y).strokeColor(COLORS.divider).stroke();
  doc.moveDown(0.5);
}

function drawTotals(doc: InstanceType<typeof PDFDocument>, sale: SaleWithIncludes) {
  doc.font("Helvetica").fontSize(9);
  doc.text("Subtotal:", MARGIN, doc.y, { continued: true });
  doc.text(fmtCurrency(sale.subtotal), TOT_X, doc.y, {
    width: 60,
    align: "right",
  });
  doc.moveDown(0.4);

  if (Number(sale.discount) > 0) {
    doc.text("Discount:", MARGIN, doc.y, { continued: true });
    doc.text(`-${fmtCurrency(sale.discount)}`, TOT_X, doc.y, {
      width: 60,
      align: "right",
    });
    doc.moveDown(0.4);
  }

  const rawPromo = sale.promoCodesUsed;
  const promoCodes = Array.isArray(rawPromo)
    ? rawPromo.filter((x): x is string => typeof x === "string")
    : [];
  if (promoCodes.length > 0) {
    doc.text("Promo Applied:", MARGIN, doc.y, { continued: true });
    doc.text(promoCodes.join(", "), TOT_X, doc.y, {
      width: 60,
      align: "right",
    });
    doc.moveDown(0.4);
  }

  doc.font("Helvetica-Bold");
  doc.text("Total:", MARGIN, doc.y, { continued: true });
  doc.text(fmtCurrency(sale.total), TOT_X, doc.y, {
    width: 60,
    align: "right",
  });
  doc.moveDown(1);
}

function drawPaymentBlock(doc: InstanceType<typeof PDFDocument>, sale: SaleWithIncludes) {
  doc.font("Helvetica-Bold").fontSize(10).text("Payment", MARGIN, doc.y);
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(9);

  if (sale.isCreditSale) {
    const amountPaid =
      sale.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
    const balanceDue =
      Math.round((Number(sale.total) - amountPaid) * 100) / 100;
    let lineY = doc.y;
    doc.text("Credit Sale", MARGIN + 8, lineY);
    lineY += 12;
    doc.text("Amount Paid:", MARGIN + 8, lineY);
    doc.text(fmtCurrency(amountPaid), TOT_X, lineY, {
      width: 60,
      align: "right",
    });
    lineY += 12;
    doc.text("Balance Due:", MARGIN + 8, lineY);
    doc.text(fmtCurrency(balanceDue), TOT_X, lineY, {
      width: 60,
      align: "right",
    });
    doc.y = lineY + 16;
  }

  if (sale.payments && sale.payments.length > 0) {
    let lineY = doc.y;
    doc.text("Paid Using:", MARGIN + 8, lineY);
    lineY += 10;
    for (const p of sale.payments) {
      const method = String(p.method).toUpperCase();
      doc.text(`${method}:`, MARGIN + 16, lineY);
      doc.text(fmtCurrency(p.amount), TOT_X, lineY, {
        width: 60,
        align: "right",
      });
      lineY += 10;
    }
    doc.y = lineY + 6;
  }
  doc.moveDown(1);
}

function drawSignatureBlock(doc: InstanceType<typeof PDFDocument>) {
  doc.font("Helvetica").fontSize(9);
  const sigY = doc.y;
  doc.text("Sold By ___________________", MARGIN, sigY, {
    width: MID_X - MARGIN - 8,
  });
  doc.text("Received By ___________________", MID_X, sigY, {
    width: TABLE_RIGHT - MID_X - 8,
  });
  doc.y = sigY + 18;
}

function drawFooter(
  doc: InstanceType<typeof PDFDocument>,
  createdDate: string,
  processedBy: string,
  pageIndex: number,
  totalPages: number,
) {
  const y = FOOTER_TOP;
  doc.font("Helvetica").fontSize(7);
  doc.text(createdDate, MARGIN, y, {
    width: USABLE_WIDTH,
    align: "center",
  });
  doc.font("Helvetica-Bold").fontSize(8);
  doc.text(`Processed by ${processedBy}`, MARGIN, y + 10, {
    width: USABLE_WIDTH,
    align: "center",
  });
  doc.font("Helvetica").fontSize(7);
  doc.text("Generated by Shamanyantra (for reference)", MARGIN, y + 20, {
    width: USABLE_WIDTH,
    align: "center",
  });
  doc.text(`Page ${pageIndex + 1} of ${totalPages}`, MARGIN, y + 28, {
    width: USABLE_WIDTH,
    align: "center",
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

    let customerName = "";
    let customerPhone = "";
    let customerAddress = "";

    if (sale.member) {
      customerName = sale.member.name ?? "";
      customerPhone = sale.member.phone ?? "";
      customerAddress = sale.member.address ?? "";
    } else if (sale.contact) {
      customerName = [sale.contact.firstName, sale.contact.lastName ?? ""]
        .filter(Boolean)
        .join(" ");
      customerPhone = sale.contact.phone ?? "";
    }

    const processedBy = sale.createdBy?.username ?? "—";

    drawHeader(doc, orgName, saleCode, locationName, locationAddress);
    drawToBlock(doc, customerName, customerPhone, customerAddress);
    drawItemsTable(doc, sale);
    drawTotals(doc, sale);
    drawPaymentBlock(doc, sale);
    drawSignatureBlock(doc);

    if (sale.notes) {
      doc.font("Helvetica-Bold").fontSize(9).text("Notes:", MARGIN, doc.y);
      doc.font("Helvetica").fontSize(8).text(sale.notes, MARGIN + 8, doc.y + 2, {
        width: USABLE_WIDTH - 16,
      });
      doc.moveDown(1);
    }

    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      drawFooter(doc, createdDate, processedBy, i, totalPages);
    }

    doc.end();
  });
}
