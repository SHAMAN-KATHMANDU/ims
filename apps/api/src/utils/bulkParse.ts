import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { z } from "zod";
import csvParser from "csv-parser";

export interface ValidationError {
  row: number;
  field?: string;
  message: string;
  value?: unknown;
}

export interface BulkParseOptions<T> {
  headerMappings: Record<string, string[]>;
  requiredColumns: string[];
  /** Zod schema that parses raw row data into T (may use transforms). */
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  /** Field names whose values to extract from each row (keys of headerMappings). */
  fields: string[];
  /** Number of Excel header rows to skip (default 1). Set to 2 if template has a hints row. */
  skipExcelRows?: number;
  /** Hint message shown when required columns are missing. */
  missingColumnsHint?: string;
}

export interface BulkParseResult<T> {
  rows: T[];
  errors: ValidationError[];
}

function normalizeHeader(header: string): string {
  return header
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "")
    .replace(/\s+/g, "");
}

function matchHeader(
  normalized: string,
  headerMappings: Record<string, string[]>,
  alreadyMapped: Set<string>,
): string | null {
  let bestMatch: { fieldName: string; priority: number } | null = null;

  for (const [fieldName, variations] of Object.entries(headerMappings)) {
    if (alreadyMapped.has(fieldName)) continue;

    if (variations.some((v) => normalized === v)) {
      bestMatch = { fieldName, priority: 2 };
      break;
    }

    if (
      !bestMatch &&
      variations.some((v) => normalized.includes(v) || v.includes(normalized))
    ) {
      bestMatch = { fieldName, priority: 1 };
    }
  }

  return bestMatch?.fieldName ?? null;
}

function validateRow<T>(
  rowData: Record<string, unknown>,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  rowNumber: number,
  errors: ValidationError[],
): T | null {
  const hasData = Object.values(rowData).some(
    (v) =>
      v !== null &&
      v !== undefined &&
      String(v).trim() !== "" &&
      String(v) !== "-",
  );
  if (!hasData) return null;

  try {
    return schema.parse(rowData);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        const fieldValue = err.path.reduce(
          (obj: Record<string, unknown>, key) =>
            (obj?.[key] as Record<string, unknown>) ?? undefined,
          rowData,
        );
        errors.push({
          row: rowNumber,
          field: err.path.join("."),
          message: err.message,
          value: fieldValue,
        });
      });
    } else {
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : "Invalid row data",
      });
    }
    return null;
  }
}

function buildRowData(
  fields: string[],
  getCellValue: (field: string) => unknown,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    data[field] = getCellValue(field);
  }
  return data;
}

/**
 * Generic bulk file parser for CSV and Excel (.xlsx) files.
 *
 * Handles header normalization, column mapping, required-column checks,
 * row-level Zod validation, and empty-row skipping.
 *
 * Throws an object with `{ status, body }` for early-exit errors
 * (empty file, missing worksheet, missing columns) so the caller can
 * forward it directly to `res.status(status).json(body)`.
 */
export async function parseBulkFile<T>(
  filePath: string,
  originalName: string,
  options: BulkParseOptions<T>,
): Promise<BulkParseResult<T>> {
  const {
    headerMappings,
    requiredColumns,
    schema,
    fields,
    skipExcelRows = 1,
    missingColumnsHint,
  } = options;

  const fileExt = path.extname(originalName).toLowerCase();
  const isCSV = fileExt === ".csv";

  const rows: T[] = [];
  const errors: ValidationError[] = [];

  if (isCSV) {
    const csvRows: Record<string, unknown>[] = [];

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("data", (row: Record<string, unknown>) => csvRows.push(row))
        .on("end", () => resolve())
        .on("error", reject);
    });

    if (csvRows.length === 0) {
      fs.unlinkSync(filePath);
      throw {
        status: 400,
        body: { message: "CSV file is empty or invalid", errors: [] },
      };
    }

    const csvHeaders = Object.keys(csvRows[0] || {});
    const csvColumnMap: Record<string, string> = {};
    const mapped = new Set<string>();

    for (const csvHeader of csvHeaders) {
      const normalized = normalizeHeader(csvHeader);
      const fieldName = matchHeader(normalized, headerMappings, mapped);
      if (fieldName) {
        csvColumnMap[fieldName] = csvHeader;
        mapped.add(fieldName);
      }
    }

    const missingColumns = requiredColumns.filter((col) => !csvColumnMap[col]);
    if (missingColumns.length > 0) {
      fs.unlinkSync(filePath);
      throw {
        status: 400,
        body: {
          message: "Missing required columns in CSV file",
          missingColumns,
          foundColumns: Object.keys(csvColumnMap),
          ...(missingColumnsHint ? { hint: missingColumnsHint } : {}),
        },
      };
    }

    csvRows.forEach((csvRow, rowIndex) => {
      const getCellValue = (fieldName: string) => {
        const col = csvColumnMap[fieldName];
        if (!col) return undefined;
        const value = csvRow[col];
        return value === "" || value === null ? undefined : value;
      };

      const rowData = buildRowData(fields, getCellValue);
      const validated = validateRow(rowData, schema, rowIndex + 2, errors);
      if (validated) rows.push(validated);
    });
  } else {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      fs.unlinkSync(filePath);
      throw {
        status: 400,
        body: {
          message: "Excel file must contain at least one worksheet",
          errors: [],
        },
      };
    }

    const excelColumnMap: Record<string, number> = {};
    const mapped = new Set<string>();
    const headerRow = worksheet.getRow(1);

    headerRow.eachCell((cell, colNumber) => {
      if (cell.value) {
        const normalized = normalizeHeader(String(cell.value).trim());
        const fieldName = matchHeader(normalized, headerMappings, mapped);
        if (fieldName) {
          excelColumnMap[fieldName] = colNumber;
          mapped.add(fieldName);
        }
      }
    });

    const missingColumns = requiredColumns.filter(
      (col) => !excelColumnMap[col],
    );
    if (missingColumns.length > 0) {
      fs.unlinkSync(filePath);
      throw {
        status: 400,
        body: {
          message: "Missing required columns in Excel file",
          missingColumns,
          foundColumns: Object.keys(excelColumnMap),
          ...(missingColumnsHint ? { hint: missingColumnsHint } : {}),
        },
      };
    }

    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex <= skipExcelRows) return;

      const getCellValue = (fieldName: string) => {
        const colNumber = excelColumnMap[fieldName];
        return colNumber ? row.getCell(colNumber).value : undefined;
      };

      const rowData = buildRowData(fields, getCellValue);
      const validated = validateRow(rowData, schema, rowIndex, errors);
      if (validated) rows.push(validated);
    });
  }

  return { rows, errors };
}
