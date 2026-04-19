import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { buildSaleBulkTemplate } from "./sale.bulk.service";

async function loadTemplate(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
}

describe("buildSaleBulkTemplate", () => {
  it("returns a non-empty Buffer", async () => {
    const buffer = await buildSaleBulkTemplate();
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("creates a 'Sales Template' worksheet", async () => {
    const wb = await loadTemplate(await buildSaleBulkTemplate());
    const names = wb.worksheets.map((ws) => ws.name);
    expect(names).toContain("Sales Template");
  });

  it("places required headers on row 1", async () => {
    const wb = await loadTemplate(await buildSaleBulkTemplate());
    const ws = wb.getWorksheet("Sales Template")!;
    const header = ws.getRow(1);

    expect(header.getCell(1).value).toBe("SN");
    expect(header.getCell(2).value).toBe("Sale ID (UUID)");
    expect(header.getCell(3).value).toBe("Date of Sale");
    expect(header.getCell(4).value).toBe("Showroom");
    expect(header.getCell(5).value).toBe("Phone");
    expect(header.getCell(6).value).toBe("Sold By");
    expect(header.getCell(7).value).toBe("Product Code");
    expect(header.getCell(8).value).toBe("Product Name");
    expect(header.getCell(10).value).toBe("Quantity");
    expect(header.getCell(11).value).toBe("MRP");
    expect(header.getCell(13).value).toBe("Final Amount");
    expect(header.getCell(14).value).toBe("Payment Method");
  });

  it("marks header row as bold", async () => {
    const wb = await loadTemplate(await buildSaleBulkTemplate());
    const ws = wb.getWorksheet("Sales Template")!;
    expect(ws.getRow(1).font?.bold).toBe(true);
  });

  it("places Required/Optional hints on row 2", async () => {
    const wb = await loadTemplate(await buildSaleBulkTemplate());
    const ws = wb.getWorksheet("Sales Template")!;
    const hints = ws.getRow(2);

    // Required: showroom, soldBy, product code, product name, qty, mrp, final amount
    expect(hints.getCell(4).value).toBe("Required"); // Showroom
    expect(hints.getCell(6).value).toBe("Required"); // Sold By
    expect(hints.getCell(7).value).toBe("Required"); // Product Code
    expect(hints.getCell(8).value).toBe("Required"); // Product Name
    expect(hints.getCell(10).value).toBe("Required"); // Quantity
    expect(hints.getCell(11).value).toBe("Required"); // MRP
    expect(hints.getCell(13).value).toBe("Required"); // Final Amount
    // Optional
    expect(hints.getCell(1).value).toBe("Optional"); // SN
    expect(hints.getCell(2).value).toBe("Optional"); // Sale ID
    expect(hints.getCell(5).value).toBe("Optional"); // Phone
    expect(hints.getCell(12).value).toBe("Optional"); // Discount
    // Payment method hint ends with the example code list
    expect(String(hints.getCell(14).value)).toMatch(/Optional/);
    expect(String(hints.getCell(14).value)).toMatch(/CASH/);
  });

  it("does not include a data row beyond the hint row", async () => {
    // Current template ships only headers + hint row; row 3 should be empty.
    const wb = await loadTemplate(await buildSaleBulkTemplate());
    const ws = wb.getWorksheet("Sales Template")!;
    const row3 = ws.getRow(3);
    const values = Array.isArray(row3.values) ? row3.values.slice(1) : [];
    expect(values.every((v) => v === null || v === undefined)).toBe(true);
  });

  it("preserves column widths configured in the template", async () => {
    const wb = await loadTemplate(await buildSaleBulkTemplate());
    const ws = wb.getWorksheet("Sales Template")!;
    // Spot-check a couple of configured widths
    expect(ws.getColumn(1).width).toBe(8); // SN
    expect(ws.getColumn(8).width).toBe(22); // Product Name
    expect(ws.getColumn(14).width).toBe(18); // Payment Method
  });

  it("is deterministic across invocations (same header shape)", async () => {
    const [a, b] = await Promise.all([
      buildSaleBulkTemplate(),
      buildSaleBulkTemplate(),
    ]);

    const wbA = await loadTemplate(a);
    const wbB = await loadTemplate(b);

    const headersA: unknown[] = [];
    const headersB: unknown[] = [];
    wbA
      .getWorksheet("Sales Template")!
      .getRow(1)
      .eachCell((cell) => headersA.push(cell.value));
    wbB
      .getWorksheet("Sales Template")!
      .getRow(1)
      .eachCell((cell) => headersB.push(cell.value));

    expect(headersA).toEqual(headersB);
  });
});
