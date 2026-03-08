/**
 * Main receipt PDF generation - orchestrates all layout components.
 */
import PDFDocument from "pdfkit";
import {
  MARGIN,
  FOOTER_TOP,
  TABLE_RIGHT,
  TOT_X,
  MID_X,
  USABLE_WIDTH,
  getPageBottom,
} from "./constants";
import { fmtDate } from "./utils";
import { registerFonts } from "./typography";
import type { ReceiptContext, SaleWithIncludes } from "./types";
import { drawHeader } from "./components/header";
import { drawCustomer } from "./components/customer";
import { drawItemsTable } from "./components/itemsTable";
import { drawTotals } from "./components/totals";
import { drawPayments } from "./components/payments";
import { drawNotes } from "./components/notes";
import { drawSignatureBlock } from "./components/signature";
import { drawFooter } from "./components/footer";

function createContext(itemCount: number): ReceiptContext {
  const singlePageMode = itemCount <= 10;
  return {
    margin: MARGIN,
    usableWidth: USABLE_WIDTH,
    pageBottom: getPageBottom(singlePageMode),
    footerTop: FOOTER_TOP,
    tableRight: TABLE_RIGHT,
    totX: TOT_X,
    midX: MID_X,
    singlePageMode,
  };
}

function extractCustomerInfo(sale: SaleWithIncludes): {
  name: string;
  phone: string;
  address: string;
} {
  let name = "";
  let phone = "";
  let address = "";

  if (sale.member) {
    name = sale.member.name ?? "";
    phone = sale.member.phone ?? "";
    address = sale.member.address ?? "";
  } else if (sale.contact) {
    name = [sale.contact.firstName, sale.contact.lastName ?? ""]
      .filter(Boolean)
      .join(" ");
    phone = sale.contact.phone ?? "";
  }

  return { name, phone, address };
}

export async function generateReceiptPdf(
  sale: SaleWithIncludes,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A5",
      margin: MARGIN,
      bufferPages: true,
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    registerFonts(doc);
    const itemCount = sale.items?.length ?? 0;
    const ctx = createContext(itemCount);

    const orgName = sale.tenant?.name ?? "—";
    const saleCode = sale.saleCode;
    const locationName =
      (sale.location && "name" in sale.location ? sale.location.name : null) ??
      "—";
    const locationAddress =
      sale.location && "address" in sale.location
        ? (sale.location.address ?? "")
        : "";

    const {
      name: customerName,
      phone: customerPhone,
      address: customerAddress,
    } = extractCustomerInfo(sale);
    const processedBy = sale.createdBy?.username ?? "—";
    const createdDate = fmtDate(sale.createdAt);

    drawHeader(doc, orgName, saleCode, locationName, locationAddress, ctx);
    drawCustomer(doc, customerName, customerPhone, customerAddress, ctx);
    drawItemsTable(doc, sale, ctx);
    drawTotals(doc, sale, ctx);
    drawPayments(doc, sale, ctx);
    drawNotes(doc, sale, ctx);
    drawSignatureBlock(doc, ctx);

    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      drawFooter(doc, createdDate, processedBy, i, totalPages, ctx);
    }

    doc.end();
  });
}
