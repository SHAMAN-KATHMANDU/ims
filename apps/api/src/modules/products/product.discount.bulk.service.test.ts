/**
 * Regression guard for GitHub issue #560.
 *
 * The "Bulk Import Discounts" round-trip — download template, then upload it
 * back — used to fail with a red "Upload failed: Missing required columns
 * in Excel file" toast because `buildDiscountBulkTemplate` put a title row
 * ("Discount Bulk Upload Template") in row 1 and the real headers in row 2,
 * while the generic parser at `utils/bulkParse.ts:248` always reads
 * `worksheet.getRow(1)` for header detection. That mismatch meant every
 * upload of the unedited template — and every download → fill-in → upload
 * the user attempted — was rejected at the very first validation step.
 *
 * These tests freeze the contract that makes the round-trip work:
 *   - Row 1 of the template IS the header row.
 *   - Feeding the template (empty data, and with a sample row) back through
 *     `parseBulkFile + getDiscountBulkParseOptions` succeeds with no
 *     missing-column error.
 *
 * A future "let's restore the pretty title row" PR will fail this test
 * instead of silently resurrecting the broken upload.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import ExcelJS from "exceljs";
import fs from "fs";
import os from "os";
import path from "path";
import { buildDiscountBulkTemplate } from "./product.discount.bulk.service";
import { getDiscountBulkParseOptions } from "./bulkUpload.discount.validation";
import { parseBulkFile } from "@/utils/bulkParse";

const HEADERS = [
  "Product Code",
  "Product Name",
  "Discount Type",
  "Discount Percentage",
  "Start Date",
  "End Date",
  "Is Active",
];

async function writeTemplateToTmp(buffer: Buffer): Promise<string> {
  const filePath = path.join(
    os.tmpdir(),
    `discounts-bulk-template-${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`,
  );
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

async function loadWorksheet(buffer: Buffer): Promise<ExcelJS.Worksheet> {
  const wb = new ExcelJS.Workbook();
  // @ts-expect-error ExcelJS xlsx.load types predate Buffer<T> generic introduced in @types/node v22
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Generated template has no worksheets");
  return ws;
}

describe("buildDiscountBulkTemplate (regression for issue #560)", () => {
  let tmpFiles: string[] = [];

  beforeEach(() => {
    tmpFiles = [];
  });

  afterEach(() => {
    // parseBulkFile unlinks on early-exit errors; survivors here are the
    // happy-path files we never reached the cleanup branch for.
    for (const f of tmpFiles) {
      try {
        fs.unlinkSync(f);
      } catch {
        /* already gone */
      }
    }
  });

  it("emits the column headers in row 1, not row 2", async () => {
    const buffer = await buildDiscountBulkTemplate();
    const ws = await loadWorksheet(buffer);

    const row1Values = (ws.getRow(1).values as Array<unknown> | undefined)
      ?.slice(1) // exceljs row.values is 1-indexed with a leading hole
      .map((v) => String(v ?? ""));

    expect(row1Values).toEqual(HEADERS);
  });

  it("round-trips: an unedited downloaded template parses with zero rows and no missing-column error", async () => {
    const buffer = await buildDiscountBulkTemplate();
    const filePath = await writeTemplateToTmp(buffer);
    tmpFiles.push(filePath);

    // parseBulkFile throws `{ status, body }` for missing-column errors —
    // that's exactly the failure mode #560 ships. Reaching `result` means
    // the round-trip works.
    const result = await parseBulkFile(
      filePath,
      "discounts_bulk_upload_template.xlsx",
      getDiscountBulkParseOptions(),
    );

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it("round-trips with a sample data row written into the template", async () => {
    // Simulate the user filling row 3 (the first data row) and re-uploading.
    const buffer = await buildDiscountBulkTemplate();
    const wb = new ExcelJS.Workbook();
    // @ts-expect-error ExcelJS xlsx.load types predate Buffer<T> generic introduced in @types/node v22
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0]!;
    ws.getRow(3).values = [
      "SKU-001", // Product Code
      "Sample Product", // Product Name
      "Member Discount", // Discount Type
      10, // Discount Percentage
      "", // Start Date
      "", // End Date
      "", // Is Active
    ];
    const filledBuffer = Buffer.from(await wb.xlsx.writeBuffer());
    const filePath = await writeTemplateToTmp(filledBuffer);
    tmpFiles.push(filePath);

    const result = await parseBulkFile(
      filePath,
      "discounts_bulk_upload_template.xlsx",
      getDiscountBulkParseOptions(),
    );

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      productCode: "SKU-001",
      productName: "Sample Product",
      discountType: "Member Discount",
      discountPercentage: 10,
    });
  });
});
