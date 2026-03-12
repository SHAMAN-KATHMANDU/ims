/**
 * Items table component with adaptive columns and text wrapping.
 */
import type PDFDocument from "pdfkit";
import { fmtCurrency, truncateWithEllipsis } from "../utils";
import { drawTableHeader, drawTableRow } from "../table";
import { drawDivider } from "../layout";
import { ensureSpace, createPageContext } from "../pagination";
import { SPACE } from "../spacing";
import type { ReceiptContext } from "../types";
import type { SaleWithIncludes } from "../types";

type Doc = InstanceType<typeof PDFDocument>;

function buildProductName(
  item: SaleWithIncludes["items"] extends (infer I)[] ? I : never,
): string {
  const productName = item?.variation?.product?.name ?? "—";
  const attrs = item?.variation?.attributes
    ?.map((a) => a.attributeValue?.value ?? "")
    .filter(Boolean)
    .join(" / ");
  const subName = item?.subVariation?.name;
  return (
    productName +
    (attrs ? ` (${attrs})` : "") +
    (subName ? ` - ${subName}` : "")
  );
}

export function drawItemsTable(
  doc: Doc,
  sale: SaleWithIncludes,
  ctx: ReceiptContext,
): void {
  const pageCtx = createPageContext(ctx);
  const items = sale.items ?? [];

  let y = doc.y;

  const repeatHeader = () => {
    y = doc.y;
    y = drawTableHeader(doc, ctx, y);
    doc.y = y;
  };

  repeatHeader();

  const MAX_PRODUCT_CHARS = 80;

  for (const item of items) {
    const product = truncateWithEllipsis(
      buildProductName(item),
      MAX_PRODUCT_CHARS,
    );
    const row = {
      product,
      price: fmtCurrency(item.unitPrice),
      qty: String(item.quantity),
      discountPct:
        Number(item.discountPercent) > 0
          ? `${Number(item.discountPercent).toFixed(1)}%`
          : "-",
      discountAmt:
        Number(item.discountAmount ?? 0) > 0
          ? fmtCurrency(item.discountAmount)
          : "-",
      total: fmtCurrency(item.lineTotal),
    };

    const productColWidth = (ctx.tableRight - ctx.margin) * 0.42 - 4;
    const rowHeight =
      doc.heightOfString(product, { width: productColWidth }) + 4;

    ensureSpace(doc, rowHeight, pageCtx, { repeatHeader });

    y = doc.y;
    y = drawTableRow(doc, row, ctx, y);
    doc.y = y;
  }

  doc.moveDown(SPACE.xs);
  drawDivider(doc, ctx);
  doc.moveDown(SPACE.xxs);
}
