import ExcelJS from "exceljs";
import prisma from "@/config/prisma";
import type { ValidationError } from "@/utils/bulkParse";
import productRepository from "./product.repository";
import type { DiscountBulkRow } from "./bulkUpload.discount.validation";

export interface ProcessDiscountBulkResult {
  created: Array<{
    productName: string;
    discountType: string;
    percentage: number;
  }>;
  skipped: Array<{
    row: number;
    productCode?: string | null;
    productName?: string | null;
    reason: string;
  }>;
  errors: ValidationError[];
}

export async function processDiscountBulkRows(
  rows: DiscountBulkRow[],
  context: { tenantId: string },
): Promise<ProcessDiscountBulkResult> {
  const { tenantId } = context;
  const created: ProcessDiscountBulkResult["created"] = [];
  const skipped: ProcessDiscountBulkResult["skipped"] = [];
  const errors: ValidationError[] = [];

  const discountTypeCache = new Map<string, string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const rowNum = i + 3; // 1-indexed + 2 header rows

    if (!row.productCode && !row.productName) {
      skipped.push({
        row: rowNum,
        productCode: null,
        productName: null,
        reason:
          "Both Product Code and Product Name are empty — cannot identify product",
      });
      continue;
    }

    const product = await productRepository.findProductByTenantAndImsOrName(
      tenantId,
      row.productCode ?? null,
      row.productName ?? "",
    );

    if (!product) {
      skipped.push({
        row: rowNum,
        productCode: row.productCode,
        productName: row.productName,
        reason: `Product not found (code: ${row.productCode ?? "—"}, name: ${row.productName ?? "—"})`,
      });
      continue;
    }

    const dtNameLower = row.discountType.toLowerCase();
    let discountTypeId = discountTypeCache.get(dtNameLower);

    if (!discountTypeId) {
      const dt = await productRepository.findDiscountTypeByName(
        tenantId,
        row.discountType,
      );
      if (!dt) {
        skipped.push({
          row: rowNum,
          productCode: row.productCode,
          productName: product.name,
          reason: `Discount type "${row.discountType}" not found — create it first in Settings`,
        });
        continue;
      }
      discountTypeId = dt.id;
      discountTypeCache.set(dtNameLower, dt.id);
    }

    try {
      await prisma.productDiscount.create({
        data: {
          productId: product.id,
          discountTypeId,
          discountPercentage: row.discountPercentage,
          value: row.discountPercentage,
          valueType: "PERCENTAGE",
          startDate: row.startDate ?? null,
          endDate: row.endDate ?? null,
          isActive: row.isActive ?? true,
        },
      });
      created.push({
        productName: product.name,
        discountType: row.discountType,
        percentage: row.discountPercentage,
      });
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === "P2002") {
        skipped.push({
          row: rowNum,
          productCode: row.productCode,
          productName: product.name,
          reason: `Discount of type "${row.discountType}" already exists for ${product.name}`,
        });
      } else {
        errors.push({
          row: rowNum,
          field: "productId",
          message: e?.message ?? "Failed to create discount",
        });
      }
    }
  }

  return { created, skipped, errors };
}

export async function buildDiscountBulkTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Discounts");

  // Row 1 MUST be the column headers — `parseBulkFile` (utils/bulkParse.ts:248)
  // always reads `worksheet.getRow(1)` for header detection. An earlier
  // version of this template prepended a "Discount Bulk Upload Template"
  // title row, which moved the real headers to row 2 and caused every
  // upload of the unedited template to fail with "Missing required columns
  // in Excel file" (issue #560). Keep headers in row 1; row 2 holds an
  // italic Required/Optional annotation row that mirrors the products
  // template (matches `getProductBulkParseOptions().skipExcelRows = 2`).
  ws.addRow([
    "Product Code",
    "Product Name",
    "Discount Type",
    "Discount Percentage",
    "Start Date",
    "End Date",
    "Is Active",
  ]);
  ws.addRow([
    "Optional",
    "Optional",
    "Required",
    "Required",
    "Optional",
    "Optional",
    "Optional",
  ]);

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9EAD3" },
  };
  ws.getRow(2).font = { italic: true, color: { argb: "FF888888" } };

  // Cell notes ride on the header cells so the hints survive after the
  // user pastes their own rows below.
  ws.getCell("A1").note =
    "Either Product Code or Product Name is required per row";
  ws.getCell("C1").note = "Must match an existing Discount Type name exactly";
  ws.getCell("D1").note = "Enter a number between 0 and 100";
  ws.getCell("E1").note = "Optional. Format: YYYY-MM-DD";
  ws.getCell("F1").note = "Optional. Format: YYYY-MM-DD";
  ws.getCell("G1").note = "Optional. true/false (default: true)";

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 30;
  ws.getColumn(3).width = 22;
  ws.getColumn(4).width = 22;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 16;
  ws.getColumn(7).width = 12;

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
