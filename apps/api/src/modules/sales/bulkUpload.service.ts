/**
 * Bulk upload sales service - parses CSV/Excel files and creates sales.
 * Extracted from sale.controller bulkUploadSales.
 */

import prisma from "@/config/prisma";
import fs from "fs";
import csvParser from "csv-parser";
import ExcelJS from "exceljs";
import { z } from "zod";
import {
  excelSaleRowSchema,
  type ExcelSaleRow,
  type ValidationError,
} from "./bulkUpload.validation";
import { generateSaleCode } from "./sales.service";
import type { AuthContext } from "@/shared/types";

const normalizeHeader = (header: string): string => {
  return header
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "")
    .replace(/\s+/g, "");
};

const headerMappings: Record<string, string[]> = {
  sn: ["sn", "sno", "serial", "serialnumber"],
  saleId: ["saleid", "sale_id", "id"],
  dateOfSale: ["dateofsale", "date_of_sale", "date", "saledate", "sale_date"],
  showroom: ["showroom", "location", "store"],
  phone: [
    "phonenumber",
    "phone_number",
    "phone",
    "customerphone",
    "customer_phone",
    "mobile",
    "contact",
  ],
  soldBy: ["soldby", "sold_by", "seller", "createdby", "created_by"],
  productImsCode: [
    "productimscode",
    "product_ims_code",
    "imscode",
    "ims_code",
    "ims",
  ],
  productName: [
    "productname",
    "product_name",
    "name",
    "product",
    "productnamr",
  ],
  variation: ["variation", "color", "design", "variations"],
  quantity: ["quantity", "qty", "qty"],
  mrp: ["mrp", "price", "unitprice", "unit_price"],
  discount: ["discount", "discountpercent", "discount_percent"],
  finalAmount: [
    "finalamount",
    "final_amount",
    "line_total",
    "linetotal",
    "amount",
  ],
  paymentMethod: ["paymentmethod", "payment_method", "method", "payment"],
};

const requiredColumns = [
  "showroom",
  "soldBy",
  "productImsCode",
  "productName",
  "variation",
  "quantity",
  "mrp",
  "finalAmount",
];

export type ParseResult = {
  rows: ExcelSaleRow[];
  errors: ValidationError[];
};

export type BulkUploadSummary = {
  total: number;
  created: number;
  skipped: number;
  errors: number;
};

export type BulkUploadCreated = {
  id: string;
  saleCode: string;
  itemsCount: number;
};

export type BulkUploadSkipped = {
  saleId: string | null;
  reason: string;
};

export type BulkUploadResult = {
  summary: BulkUploadSummary;
  created: BulkUploadCreated[];
  skipped: BulkUploadSkipped[];
  errors: ValidationError[];
};

function buildCsvColumnMap(
  csvRows: Record<string, unknown>[],
): Record<string, string> | null {
  if (csvRows.length === 0) return null;
  const csvColumnMap: Record<string, string> = {};
  const csvHeaders = Object.keys(csvRows[0] || {});

  for (const csvHeader of csvHeaders) {
    const normalized = normalizeHeader(csvHeader);
    let bestMatch: { fieldName: string; priority: number } | null = null;
    for (const [fieldName, variations] of Object.entries(headerMappings)) {
      if (csvColumnMap[fieldName]) continue;
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
    if (bestMatch) csvColumnMap[bestMatch.fieldName] = csvHeader;
  }

  const missingColumns = requiredColumns.filter((col) => !csvColumnMap[col]);
  return missingColumns.length > 0 ? null : csvColumnMap;
}

function buildExcelColumnMap(
  headerRow: ExcelJS.Row,
): Record<string, number> | null {
  const columnMap: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    if (cell.value) {
      const headerValue = String(cell.value).trim();
      const normalized = normalizeHeader(headerValue);
      let bestMatch: { fieldName: string; priority: number } | null = null;
      for (const [fieldName, variations] of Object.entries(headerMappings)) {
        if (columnMap[fieldName]) continue;
        if (variations.some((v) => normalized === v)) {
          bestMatch = { fieldName, priority: 2 };
          break;
        }
        if (
          !bestMatch &&
          variations.some(
            (v) => normalized.includes(v) || v.includes(normalized),
          )
        ) {
          bestMatch = { fieldName, priority: 1 };
        }
      }
      if (bestMatch) columnMap[bestMatch.fieldName] = colNumber;
    }
  });

  const missingColumns = requiredColumns.filter((col) => !columnMap[col]);
  return missingColumns.length > 0 ? null : columnMap;
}

function hasRowData(rowData: Record<string, unknown>): boolean {
  return Object.values(rowData).some(
    (v) =>
      v !== null &&
      v !== undefined &&
      String(v).trim() !== "" &&
      String(v) !== "-",
  );
}

export async function parseCsv(filePath: string): Promise<ParseResult> {
  const rows: ExcelSaleRow[] = [];
  const errors: ValidationError[] = [];

  const csvRows: Record<string, unknown>[] = [];
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row: Record<string, unknown>) => csvRows.push(row))
      .on("end", () => resolve())
      .on("error", reject);
  });

  const csvColumnMap = buildCsvColumnMap(csvRows);
  if (!csvColumnMap) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          message: "Missing required columns in CSV file",
        },
      ],
    };
  }

  csvRows.forEach((csvRow, rowIndex) => {
    const getCellValue = (fieldName: string) => {
      const col = csvColumnMap[fieldName];
      if (!col) return undefined;
      const value = csvRow[col];
      return value === "" || value === null ? undefined : value;
    };
    const rowData = {
      sn: getCellValue("sn"),
      saleId: getCellValue("saleId"),
      dateOfSale: getCellValue("dateOfSale"),
      showroom: getCellValue("showroom"),
      phone: getCellValue("phone"),
      soldBy: getCellValue("soldBy"),
      productImsCode: getCellValue("productImsCode"),
      productName: getCellValue("productName"),
      variation: getCellValue("variation"),
      quantity: getCellValue("quantity"),
      mrp: getCellValue("mrp"),
      discount: getCellValue("discount"),
      finalAmount: getCellValue("finalAmount"),
      paymentMethod: getCellValue("paymentMethod"),
    };
    if (!hasRowData(rowData)) return;

    try {
      rows.push(excelSaleRowSchema.parse(rowData));
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err: z.ZodIssue) => {
          const fieldValue = err.path.reduce(
            (obj: unknown, key: string | number) =>
              obj != null && typeof obj === "object" && String(key) in obj
                ? (obj as Record<string, unknown>)[String(key)]
                : undefined,
            rowData,
          );
          errors.push({
            row: rowIndex + 2,
            field: err.path.join("."),
            message: err.message,
            value: fieldValue,
          });
        });
      } else {
        errors.push({
          row: rowIndex + 2,
          message: error instanceof Error ? error.message : "Invalid row data",
        });
      }
    }
  });

  return { rows, errors };
}

export async function parseExcel(filePath: string): Promise<ParseResult> {
  const rows: ExcelSaleRow[] = [];
  const errors: ValidationError[] = [];

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          message: "Excel file must contain at least one worksheet",
        },
      ],
    };
  }

  const headerRow = worksheet.getRow(1);
  const columnMap = buildExcelColumnMap(headerRow);
  if (!columnMap) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          message: "Missing required columns in Excel file",
        },
      ],
    };
  }

  worksheet.eachRow((row, rowIndex) => {
    if (rowIndex === 1) return;
    const getCellValue = (fieldName: string) => {
      const colNumber = columnMap[fieldName];
      return colNumber ? row.getCell(colNumber).value : undefined;
    };
    const rowData = {
      sn: getCellValue("sn"),
      saleId: getCellValue("saleId"),
      dateOfSale: getCellValue("dateOfSale"),
      showroom: getCellValue("showroom"),
      phone: getCellValue("phone"),
      soldBy: getCellValue("soldBy"),
      productImsCode: getCellValue("productImsCode"),
      productName: getCellValue("productName"),
      variation: getCellValue("variation"),
      quantity: getCellValue("quantity"),
      mrp: getCellValue("mrp"),
      discount: getCellValue("discount"),
      finalAmount: getCellValue("finalAmount"),
      paymentMethod: getCellValue("paymentMethod"),
    };
    if (!hasRowData(rowData)) return;

    try {
      rows.push(excelSaleRowSchema.parse(rowData));
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err: z.ZodIssue) => {
          const fieldValue = err.path.reduce(
            (obj: unknown, key: string | number) =>
              obj != null && typeof obj === "object" && String(key) in obj
                ? (obj as Record<string, unknown>)[String(key)]
                : undefined,
            rowData,
          );
          errors.push({
            row: rowIndex,
            field: err.path.join("."),
            message: err.message,
            value: fieldValue,
          });
        });
      } else {
        errors.push({
          row: rowIndex,
          message: error instanceof Error ? error.message : "Invalid row data",
        });
      }
    }
  });

  return { rows, errors };
}

const parserHandlers: Record<
  string,
  (filePath: string) => Promise<ParseResult>
> = {
  ".csv": parseCsv,
  ".xlsx": parseExcel,
};

type SaleGroup = {
  saleId: string | null;
  dateOfSale: Date | null;
  showroom: string;
  soldBy: string;
  rows: ExcelSaleRow[];
};

function groupRowsBySale(rows: ExcelSaleRow[]): Map<string, SaleGroup> {
  const saleGroups = new Map<string, SaleGroup>();

  rows.forEach((row) => {
    let groupKey: string;
    if (row.saleId) {
      groupKey = `id:${row.saleId}`;
    } else {
      const dateStr = row.dateOfSale
        ? row.dateOfSale.toISOString().split("T")[0]
        : "no-date";
      groupKey = `group:${dateStr}-${row.showroom.toLowerCase()}-${row.soldBy.toLowerCase()}`;
    }

    if (!saleGroups.has(groupKey)) {
      saleGroups.set(groupKey, {
        saleId: row.saleId,
        dateOfSale: row.dateOfSale,
        showroom: row.showroom,
        soldBy: row.soldBy,
        rows: [],
      });
    }
    saleGroups.get(groupKey)!.rows.push(row);
  });

  return saleGroups;
}

export async function generateBulkUploadTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sales Template");

  const headers = [
    { header: "SN", width: 8 },
    { header: "Sale ID (UUID)", width: 18 },
    { header: "Date of Sale", width: 14 },
    { header: "Showroom", width: 15 },
    { header: "Phone", width: 14 },
    { header: "Sold By", width: 14 },
    { header: "Product IMS Code", width: 18 },
    { header: "Product Name", width: 22 },
    { header: "Variation", width: 14 },
    { header: "Quantity", width: 10 },
    { header: "MRP", width: 10 },
    { header: "Discount", width: 10 },
    { header: "Final Amount", width: 14 },
    { header: "Payment Method", width: 18 },
  ];
  const requiredOptional = [
    "Optional",
    "Optional",
    "Optional",
    "Required",
    "Optional",
    "Required",
    "Required",
    "Required",
    "Required",
    "Required",
    "Required",
    "Optional",
    "Required",
    "Optional (CASH, CARD, CHEQUE, FONEPAY, QR)",
  ];

  worksheet.columns = headers.map((h) => ({
    header: h.header,
    width: h.width,
  }));
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };
  const row2 = worksheet.getRow(2);
  requiredOptional.forEach((text, i) => {
    row2.getCell(i + 1).value = text;
  });
  row2.font = { italic: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function processSalesUpload(
  filePath: string,
  fileExt: string,
  auth: AuthContext,
): Promise<BulkUploadResult> {
  const errors: ValidationError[] = [];
  const createdSales: BulkUploadCreated[] = [];
  const skippedSales: BulkUploadSkipped[] = [];

  try {
    const ext = fileExt.toLowerCase();
    const parser = parserHandlers[ext];
    if (!parser) {
      return {
        summary: { total: 0, created: 0, skipped: 0, errors: 1 },
        created: [],
        skipped: [],
        errors: [
          {
            row: 0,
            message: `Unsupported file format: ${ext}. Use .csv or .xlsx`,
          },
        ],
      };
    }

    const { rows, errors: parseErrors } = await parser(filePath);
    errors.push(...parseErrors);

    if (rows.length === 0 && parseErrors.length === 0) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore cleanup errors
      }
      return {
        summary: { total: 0, created: 0, skipped: 0, errors: 0 },
        created: [],
        skipped: [],
        errors: [
          {
            row: 0,
            message: "File is empty or invalid",
          },
        ],
      };
    }

    const saleGroups = groupRowsBySale(rows);

    const allLocations = await prisma.location.findMany({
      where: {
        tenantId: auth.tenantId,
        type: "SHOWROOM",
        isActive: true,
      },
      select: { id: true, name: true },
    });
    const locationMap = new Map(
      allLocations.map((loc) => [loc.name.toLowerCase(), loc.id]),
    );

    const allUsers = await prisma.user.findMany({
      where: { tenantId: auth.tenantId },
      select: { id: true, username: true },
    });
    const userMap = new Map(
      allUsers.map((u) => [u.username.toLowerCase(), u.id]),
    );

    const allProducts = await prisma.product.findMany({
      where: { tenantId: auth.tenantId, deletedAt: null },
      select: { id: true, imsCode: true, name: true },
    });
    const productMapByIms = new Map(
      allProducts.map((p) => [p.imsCode.toLowerCase(), p]),
    );
    const productMapByName = new Map(
      allProducts.map((p) => [p.name.toLowerCase(), p]),
    );

    for (const [, group] of saleGroups.entries()) {
      try {
        if (group.rows.length === 0) continue;

        const firstRow = group.rows[0];

        if (group.saleId) {
          const existingSale = await prisma.sale.findFirst({
            where: { id: group.saleId, tenantId: auth.tenantId },
          });
          if (existingSale) {
            skippedSales.push({
              saleId: group.saleId,
              reason: `Sale with ID "${group.saleId}" already exists`,
            });
            continue;
          }
        }

        const showroomNameLower = firstRow.showroom.toLowerCase();
        let locationId = locationMap.get(showroomNameLower);

        if (!locationId) {
          const location = allLocations.find(
            (l) => l.name.toLowerCase() === showroomNameLower,
          );
          if (location) {
            locationId = location.id;
            locationMap.set(showroomNameLower, locationId);
          } else {
            errors.push({
              row: rows.indexOf(firstRow) + 2,
              field: "showroom",
              message: `Showroom "${firstRow.showroom}" not found or is not active`,
              value: firstRow.showroom,
            });
            skippedSales.push({
              saleId: group.saleId,
              reason: `Showroom "${firstRow.showroom}" not found`,
            });
            continue;
          }
        }

        const soldByLower = firstRow.soldBy.toLowerCase();
        let userId = userMap.get(soldByLower);

        if (!userId) {
          const user = allUsers.find(
            (u) => u.username.toLowerCase() === soldByLower,
          );
          if (user) {
            userId = user.id;
            userMap.set(soldByLower, userId);
          } else {
            errors.push({
              row: rows.indexOf(firstRow) + 2,
              field: "soldBy",
              message: `User "${firstRow.soldBy}" not found`,
              value: firstRow.soldBy,
            });
            skippedSales.push({
              saleId: group.saleId,
              reason: `User "${firstRow.soldBy}" not found`,
            });
            continue;
          }
        }

        let memberId: string | null = null;
        let saleType: "GENERAL" | "MEMBER" = "GENERAL";

        const phoneVal = firstRow.phone;
        if (phoneVal && phoneVal.length > 0) {
          let member = await prisma.member.findFirst({
            where: { phone: phoneVal },
          });
          if (!member) {
            member = await prisma.member.create({
              data: {
                tenantId: auth.tenantId,
                phone: phoneVal,
              },
            });
          }
          memberId = member.id;
          saleType = "MEMBER";
        }

        const saleItems: Array<{
          variationId: string;
          quantity: number;
          unitPrice: number;
          discountPercent: number;
          discountAmount: number;
          lineTotal: number;
        }> = [];

        let subtotal = 0;
        let totalDiscount = 0;

        for (const itemRow of group.rows) {
          const imsCodeLower = itemRow.productImsCode.toLowerCase();
          const nameLower = itemRow.productName.toLowerCase();

          const product =
            productMapByIms.get(imsCodeLower) ||
            productMapByName.get(nameLower);

          if (!product) {
            errors.push({
              row: rows.indexOf(itemRow) + 2,
              field: "productImsCode",
              message: `Product with IMS code "${itemRow.productImsCode}" or name "${itemRow.productName}" not found`,
              value: itemRow.productImsCode,
            });
            continue;
          }

          const variation = await prisma.productVariation.findFirst({
            where: {
              productId: product.id,
              color: {
                equals: itemRow.variation,
                mode: "insensitive",
              },
            },
          });

          if (!variation) {
            errors.push({
              row: rows.indexOf(itemRow) + 2,
              field: "variation",
              message: `Variation "${itemRow.variation}" not found for product "${itemRow.productName}"`,
              value: itemRow.variation,
            });
            continue;
          }

          const unitPrice = itemRow.mrp;
          const quantity = itemRow.quantity;
          const totalMrp = unitPrice * quantity;
          const discountPercent = itemRow.discount || 0;
          const discountAmount = (totalMrp * discountPercent) / 100;
          const lineTotal = itemRow.finalAmount;

          subtotal += totalMrp;
          totalDiscount += discountAmount;

          saleItems.push({
            variationId: variation.id,
            quantity,
            unitPrice,
            discountPercent,
            discountAmount,
            lineTotal,
          });
        }

        if (saleItems.length === 0) {
          skippedSales.push({
            saleId: group.saleId,
            reason: "No valid items found for this sale",
          });
          continue;
        }

        const total = subtotal - totalDiscount;

        const paymentMethods = group.rows
          .map((r) => r.paymentMethod)
          .filter(
            (method): method is string =>
              method !== null && method !== undefined,
          );
        const paymentMethod =
          paymentMethods.length > 0
            ? (paymentMethods[0] as
                | "CASH"
                | "CARD"
                | "CHEQUE"
                | "FONEPAY"
                | "QR")
            : "CASH";

        const sale = await prisma.sale.create({
          data: {
            tenantId: auth.tenantId,
            ...(group.saleId && { id: group.saleId }),
            saleCode: generateSaleCode(),
            type: saleType,
            locationId,
            ...(memberId && { memberId }),
            createdById: userId,
            subtotal,
            discount: totalDiscount,
            total,
            createdAt: group.dateOfSale || new Date(),
            items: {
              create: saleItems.map((item) => ({
                variationId: item.variationId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalMrp: item.unitPrice * item.quantity,
                discountPercent: item.discountPercent,
                discountAmount: item.discountAmount,
                lineTotal: item.lineTotal,
              })),
            },
            payments: {
              create: [
                {
                  method: paymentMethod,
                  amount: total,
                },
              ],
            },
          },
          include: {
            items: true,
          },
        });

        createdSales.push({
          id: sale.id,
          saleCode: sale.saleCode,
          itemsCount: sale.items.length,
        });
      } catch (error: unknown) {
        const rowIndex = rows.indexOf(group.rows[0]) + 2;
        errors.push({
          row: rowIndex,
          message:
            error instanceof Error ? error.message : "Error creating sale",
        });
        skippedSales.push({
          saleId: group.saleId,
          reason:
            error instanceof Error ? error.message : "Error creating sale",
        });
      }
    }

    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore cleanup errors
    }

    return {
      summary: {
        total: saleGroups.size,
        created: createdSales.length,
        skipped: skippedSales.length,
        errors: errors.length,
      },
      created: createdSales,
      skipped: skippedSales,
      errors,
    };
  } catch (error: unknown) {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
    }
    throw error;
  }
}
