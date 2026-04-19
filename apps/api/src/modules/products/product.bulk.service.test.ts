import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { buildProductBulkTemplate } from "./product.bulk.service";

async function loadTemplate(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
}

describe("buildProductBulkTemplate", () => {
  it("returns a non-empty Buffer", async () => {
    const buffer = await buildProductBulkTemplate();
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("creates a 'Products Template' + 'Instructions' sheet", async () => {
    const wb = await loadTemplate(await buildProductBulkTemplate());
    const names = wb.worksheets.map((ws) => ws.name);
    expect(names).toContain("Products Template");
    expect(names).toContain("Instructions");
  });

  it("places required headers on row 1 of Products Template", async () => {
    const wb = await loadTemplate(await buildProductBulkTemplate());
    const ws = wb.getWorksheet("Products Template")!;
    const header = ws.getRow(1);

    // Spot-check a few headers at expected positions
    expect(header.getCell(1).value).toBe("Product Code");
    expect(header.getCell(2).value).toBe("Location");
    expect(header.getCell(3).value).toBe("Category");
    expect(header.getCell(5).value).toBe("Name of Product");
    expect(header.getCell(12).value).toBe("Qty");
    expect(header.getCell(13).value).toBe("Cost Price");
    expect(header.getCell(14).value).toBe("Final SP");
  });

  it("marks header row as bold", async () => {
    const wb = await loadTemplate(await buildProductBulkTemplate());
    const ws = wb.getWorksheet("Products Template")!;
    expect(ws.getRow(1).font?.bold).toBe(true);
  });

  it("places Required/Optional hints on row 2", async () => {
    const wb = await loadTemplate(await buildProductBulkTemplate());
    const ws = wb.getWorksheet("Products Template")!;
    const hints = ws.getRow(2);

    // Location + Category + Name + CostPrice + FinalSP are required
    expect(hints.getCell(2).value).toBe("Required"); // Location
    expect(hints.getCell(3).value).toBe("Required"); // Category
    expect(hints.getCell(5).value).toBe("Required"); // Name
    expect(hints.getCell(13).value).toBe("Required"); // Cost Price
    expect(hints.getCell(14).value).toBe("Required"); // Final SP
    // Optional examples
    expect(hints.getCell(1).value).toBe("Optional"); // Product Code
    expect(hints.getCell(12).value).toBe("Optional"); // Qty
  });

  it("places a sample row on row 3", async () => {
    const wb = await loadTemplate(await buildProductBulkTemplate());
    const ws = wb.getWorksheet("Products Template")!;
    const example = ws.getRow(3);

    expect(example.getCell(1).value).toBe("1001");
    expect(example.getCell(2).value).toBe("Main Warehouse");
    expect(example.getCell(5).value).toBe("T-Shirt");
    expect(example.getCell(15).value).toBe("Red");
    expect(example.getCell(16).value).toBe("L");
    expect(example.getCell(17).value).toBe("Cotton");
  });

  it("provides at least three attribute columns for variations", async () => {
    const wb = await loadTemplate(await buildProductBulkTemplate());
    const ws = wb.getWorksheet("Products Template")!;
    const header = ws.getRow(1);
    expect(header.getCell(15).value).toBe("Attribute 1");
    expect(header.getCell(16).value).toBe("Attribute 2");
    expect(header.getCell(17).value).toBe("Attribute 3");
  });

  it("includes guidance rows in the Instructions sheet", async () => {
    const wb = await loadTemplate(await buildProductBulkTemplate());
    const instructions = wb.getWorksheet("Instructions")!;

    // Row 1 is headers (Topic / Details); data rows start at 2
    const topicsOnDataRows: string[] = [];
    instructions.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const topic = row.getCell(1).value;
      if (typeof topic === "string") topicsOnDataRows.push(topic);
    });

    expect(topicsOnDataRows).toEqual(
      expect.arrayContaining([
        "Attribute Columns",
        "Dynamic Detection",
        "Same Product Code",
        "Attributes Reuse",
        "Example",
      ]),
    );
  });

  it("is deterministic across invocations (same header shape)", async () => {
    const [a, b] = await Promise.all([
      buildProductBulkTemplate(),
      buildProductBulkTemplate(),
    ]);

    const wbA = await loadTemplate(a);
    const wbB = await loadTemplate(b);

    const headersA: unknown[] = [];
    const headersB: unknown[] = [];
    wbA
      .getWorksheet("Products Template")!
      .getRow(1)
      .eachCell((cell) => headersA.push(cell.value));
    wbB
      .getWorksheet("Products Template")!
      .getRow(1)
      .eachCell((cell) => headersB.push(cell.value));

    expect(headersA).toEqual(headersB);
  });
});
