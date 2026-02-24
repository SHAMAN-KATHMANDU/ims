/**
 * Products bulk upload service - parses CSV/Excel and creates/updates products.
 * Extracted from product.bulk.controller.
 */

import prisma from "@/config/prisma";
import fs from "fs";
import path from "path";
import { z } from "zod";
import csvParser from "csv-parser";
import ExcelJS from "exceljs";
import {
  excelProductRowSchema,
  type ExcelProductRow,
  type ValidationError,
} from "./bulkUpload.validation";

const normalizeHeader = (header: string): string =>
  header
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "")
    .replace(/\s+/g, "");

const headerMappings: Record<string, string[]> = {
  imsCode: ["imscode", "ims_code", "ims"],
  location: ["location", "locationname", "location_id", "locationid"],
  category: ["category"],
  subCategory: ["subcategory", "sub-category", "sub_category"],
  name: ["nameofproduct", "name", "productname", "product_name"],
  variation: [
    "variations",
    "variation",
    "designs",
    "colors",
    "variationsdesignscolors",
  ],
  material: ["material"],
  length: ["length"],
  breadth: ["breadth", "bredth", "width"],
  height: ["height"],
  weight: ["weight"],
  vendor: ["vendor"],
  quantity: ["qty", "quantity"],
  costPrice: ["costprice", "cost_price", "cost"],
  finalSP: ["finalsp", "final_sp", "sellingprice", "mrp", "price"],
  nonMemberDiscount: ["nonmemberdiscount", "non_member_discount", "nonmember"],
  memberDiscount: ["memberdiscount", "member_discount", "member"],
  wholesaleDiscount: ["wholesalediscount", "wholesale_discount", "wholesale"],
};

const requiredColumns = [
  "imsCode",
  "location",
  "category",
  "name",
  "variation",
  "costPrice",
  "finalSP",
];

export type ParseProductFileResult = {
  rows: ExcelProductRow[];
  errors: ValidationError[];
  missingColumns?: string[];
  foundColumns?: string[];
};

function pushRowErrors(
  errors: ValidationError[],
  error: unknown,
  rowData: Record<string, unknown>,
  rowIndex: number,
): void {
  if (error instanceof z.ZodError) {
    error.errors.forEach((err) => {
      const fieldValue = err.path.reduce(
        (obj: unknown, key: string | number) =>
          (obj as Record<string, unknown>)?.[String(key)],
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
      message: (error as Error).message || "Invalid row data",
    });
  }
}

export async function parseProductFile(
  filePath: string,
  isCSV: boolean,
): Promise<ParseProductFileResult> {
  const errors: ValidationError[] = [];
  let rows: ExcelProductRow[] = [];
  let columnMap: Record<string, string> = {};

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
      return { rows: [], errors: [] };
    }

    const csvHeaders = Object.keys(csvRows[0] || {});
    for (const csvHeader of csvHeaders) {
      const normalized = normalizeHeader(csvHeader);
      let bestMatch: { fieldName: string } | null = null;
      for (const [fieldName, variations] of Object.entries(headerMappings)) {
        if (columnMap[fieldName]) continue;
        if (variations.some((v) => normalized === v)) {
          bestMatch = { fieldName };
          break;
        }
        if (
          !bestMatch &&
          variations.some(
            (v) => normalized.includes(v) || v.includes(normalized),
          )
        ) {
          bestMatch = { fieldName };
        }
      }
      if (bestMatch) columnMap[bestMatch.fieldName] = csvHeader;
    }

    const missingColumns = requiredColumns.filter((col) => !columnMap[col]);
    if (missingColumns.length > 0) {
      return {
        rows: [],
        errors: [],
        missingColumns,
        foundColumns: Object.keys(columnMap),
      };
    }

    csvRows.forEach((csvRow, rowIndex) => {
      const getCellValue = (fieldName: string) => {
        const csvColumnName = columnMap[fieldName];
        if (!csvColumnName) return undefined;
        const value = csvRow[csvColumnName];
        return value === "" || value === null ? undefined : value;
      };
      const rowData = {
        imsCode: getCellValue("imsCode"),
        location: getCellValue("location"),
        category: getCellValue("category"),
        subCategory: getCellValue("subCategory"),
        name: getCellValue("name"),
        variation: getCellValue("variation"),
        material: getCellValue("material"),
        length: getCellValue("length"),
        breadth: getCellValue("breadth"),
        height: getCellValue("height"),
        weight: getCellValue("weight"),
        vendor: getCellValue("vendor"),
        quantity: getCellValue("quantity"),
        costPrice: getCellValue("costPrice"),
        finalSP: getCellValue("finalSP"),
        nonMemberDiscount: getCellValue("nonMemberDiscount"),
        memberDiscount: getCellValue("memberDiscount"),
        wholesaleDiscount: getCellValue("wholesaleDiscount"),
      };
      const hasData = Object.values(rowData).some(
        (value) =>
          value !== null && value !== undefined && String(value).trim() !== "",
      );
      if (!hasData) return;
      try {
        rows.push(excelProductRowSchema.parse(rowData));
      } catch (error: unknown) {
        pushRowErrors(errors, error, rowData, rowIndex + 2);
      }
    });
  } else {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return { rows: [], errors: [] };
    }

    const headerRow = worksheet.getRow(1);
    const excelColumnMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      if (cell.value) {
        const headerValue = String(cell.value).trim();
        const normalized = normalizeHeader(headerValue);
        let bestMatch: { fieldName: string } | null = null;
        for (const [fieldName, variations] of Object.entries(headerMappings)) {
          if (excelColumnMap[fieldName]) continue;
          if (variations.some((v) => normalized === v)) {
            bestMatch = { fieldName };
            break;
          }
          if (
            !bestMatch &&
            variations.some(
              (v) => normalized.includes(v) || v.includes(normalized),
            )
          ) {
            bestMatch = { fieldName };
          }
        }
        if (bestMatch) excelColumnMap[bestMatch.fieldName] = colNumber;
      }
    });

    const missingColumns = requiredColumns.filter(
      (col) => !excelColumnMap[col],
    );
    if (missingColumns.length > 0) {
      return {
        rows: [],
        errors: [],
        missingColumns,
        foundColumns: Object.keys(excelColumnMap),
      };
    }

    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return;
      const getCellValue = (fieldName: string) => {
        const colNumber = excelColumnMap[fieldName];
        return colNumber ? row.getCell(colNumber).value : undefined;
      };
      const rowData = {
        imsCode: getCellValue("imsCode"),
        location: getCellValue("location"),
        category: getCellValue("category"),
        subCategory: getCellValue("subCategory"),
        name: getCellValue("name"),
        variation: getCellValue("variation"),
        material: getCellValue("material"),
        length: getCellValue("length"),
        breadth: getCellValue("breadth"),
        height: getCellValue("height"),
        weight: getCellValue("weight"),
        vendor: getCellValue("vendor"),
        quantity: getCellValue("quantity"),
        costPrice: getCellValue("costPrice"),
        finalSP: getCellValue("finalSP"),
        nonMemberDiscount: getCellValue("nonMemberDiscount"),
        memberDiscount: getCellValue("memberDiscount"),
        wholesaleDiscount: getCellValue("wholesaleDiscount"),
      };
      const hasData = Object.values(rowData).some(
        (value) =>
          value !== null && value !== undefined && String(value).trim() !== "",
      );
      if (!hasData) return;
      try {
        rows.push(excelProductRowSchema.parse(rowData));
      } catch (error: unknown) {
        pushRowErrors(
          errors,
          error,
          rowData as Record<string, unknown>,
          rowIndex,
        );
      }
    });
  }

  return { rows, errors };
}

export type BulkUploadProductResult = {
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  created: unknown[];
  updated: unknown[];
  skipped: unknown[];
  errors: ValidationError[];
};

type RowWithLocation = ExcelProductRow & { locationId: string };

export async function processBulkUpload(params: {
  tenantId: string;
  userId: string;
  rows: ExcelProductRow[];
}): Promise<BulkUploadProductResult> {
  const { tenantId, userId, rows } = params;
  const errors: ValidationError[] = [];
  const createdProducts: unknown[] = [];
  const updatedProducts: unknown[] = [];
  const skippedProducts: unknown[] = [];

  const [allCategories, allDiscountTypes, allLocations] = await Promise.all([
    prisma.category.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    }),
    prisma.discountType.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    }),
    prisma.location.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  const categoryMap = new Map(
    allCategories.map((cat) => [cat.name.toLowerCase(), cat.id]),
  );
  const discountTypeMap = new Map(
    allDiscountTypes.map((dt) => [dt.name.toLowerCase(), dt.id]),
  );
  const locationByNameMap = new Map(
    allLocations.map((loc) => [loc.name.toLowerCase().trim(), loc.id]),
  );
  const locationByIdMap = new Map(allLocations.map((loc) => [loc.id, loc.id]));

  const rowsWithLocation: RowWithLocation[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const locationInput = String(row.location).trim();
    const locationId =
      locationByIdMap.get(locationInput) ??
      locationByNameMap.get(locationInput.toLowerCase());
    if (!locationId) {
      errors.push({
        row: i + 2,
        field: "location",
        message: `Location "${locationInput}" not found. Use an existing showroom/warehouse name or ID.`,
        value: locationInput,
      });
      continue;
    }
    rowsWithLocation.push({ ...row, locationId });
  }

  const productGroups = new Map<
    string,
    { product: RowWithLocation; variations: RowWithLocation[] }
  >();
  rowsWithLocation.forEach((row) => {
    const key = `${row.imsCode}-${row.name}`;
    if (!productGroups.has(key)) {
      productGroups.set(key, { product: row, variations: [] });
    }
    productGroups.get(key)!.variations.push(row);
  });

  const discountMappings: Record<string, string> = {
    "non member": "Normal",
    member: "Member",
    wholesale: "Wholesale",
  };

  for (const [, group] of productGroups.entries()) {
    const firstRow = group.product;
    const variations = group.variations;

    try {
      const categoryNameLower = firstRow.category.toLowerCase();
      const categoryNameOriginal = firstRow.category.trim();
      let categoryId = categoryMap.get(categoryNameLower);

      if (!categoryId) {
        let existingCategory = await prisma.category.findFirst({
          where: { tenantId, name: categoryNameOriginal },
        });
        if (!existingCategory) {
          const allCats = await prisma.category.findMany({
            where: {
              tenantId,
              name: { contains: categoryNameOriginal, mode: "insensitive" },
            },
          });
          existingCategory =
            allCats.find(
              (cat) => cat.name.toLowerCase() === categoryNameLower,
            ) || null;
        }
        if (existingCategory) {
          categoryId = existingCategory.id;
          categoryMap.set(categoryNameLower, categoryId);
        } else {
          try {
            const newCategory = await prisma.category.create({
              data: { tenantId, name: categoryNameOriginal },
            });
            categoryId = newCategory.id;
            categoryMap.set(categoryNameLower, categoryId);
          } catch (createError: unknown) {
            const err = createError as { code?: string };
            if (err.code === "P2002") {
              const foundCategory = await prisma.category.findFirst({
                where: { tenantId, name: categoryNameOriginal },
              });
              if (foundCategory) {
                categoryId = foundCategory.id;
                categoryMap.set(categoryNameLower, categoryId);
              } else {
                throw createError;
              }
            } else {
              throw createError;
            }
          }
        }
      }

      const existingProduct = await prisma.product.findFirst({
        where: { tenantId, imsCode: firstRow.imsCode },
        include: { variations: true },
      });

      if (existingProduct) {
        const variationByColor = new Map(
          existingProduct.variations.map((v) => [v.color.toLowerCase(), v]),
        );
        let inventoryUpserted = 0;
        for (const variationRow of variations) {
          const variation = variationByColor.get(
            variationRow.variation.toLowerCase(),
          );
          if (!variation) {
            errors.push({
              row: rowsWithLocation.indexOf(variationRow) + 2,
              field: "variation",
              message: `Variation "${variationRow.variation}" does not exist for product ${firstRow.imsCode}. Add a row with this variation first or create the product.`,
              value: variationRow.variation,
            });
            continue;
          }
          const qty = variationRow.quantity ?? 0;
          const existing = await prisma.locationInventory.findFirst({
            where: {
              locationId: variationRow.locationId,
              variationId: variation.id,
              subVariationId: null,
            },
          });
          if (existing) {
            await prisma.locationInventory.update({
              where: { id: existing.id },
              data: { quantity: qty },
            });
          } else {
            await prisma.locationInventory.create({
              data: {
                locationId: variationRow.locationId,
                variationId: variation.id,
                subVariationId: null,
                quantity: qty,
              },
            });
          }
          inventoryUpserted++;
        }
        const locationNames = [
          ...new Set(
            variations.map(
              (r) =>
                allLocations.find((l) => l.id === r.locationId)?.name ??
                r.locationId,
            ),
          ),
        ];
        updatedProducts.push({
          imsCode: existingProduct.imsCode,
          name: existingProduct.name,
          locations: locationNames,
          inventoryRowsUpdated: inventoryUpserted,
        });
        continue;
      }

      const uniqueVariationColors = [
        ...new Set(variations.map((v) => v.variation.trim())),
      ];
      const productVariations = uniqueVariationColors.map((color) => ({
        color,
        stockQuantity: 0,
      }));

      const discounts: {
        discountTypeId: string;
        discountPercentage: number;
        isActive: boolean;
      }[] = [];

      if (
        firstRow.nonMemberDiscount !== null &&
        firstRow.nonMemberDiscount !== undefined
      ) {
        const discountTypeId = discountTypeMap.get(
          discountMappings["non member"].toLowerCase(),
        );
        if (discountTypeId) {
          discounts.push({
            discountTypeId,
            discountPercentage: firstRow.nonMemberDiscount,
            isActive: true,
          });
        }
      }
      if (
        firstRow.memberDiscount !== null &&
        firstRow.memberDiscount !== undefined
      ) {
        const discountTypeId = discountTypeMap.get(
          discountMappings["member"].toLowerCase(),
        );
        if (discountTypeId) {
          discounts.push({
            discountTypeId,
            discountPercentage: firstRow.memberDiscount,
            isActive: true,
          });
        }
      }
      if (
        firstRow.wholesaleDiscount !== null &&
        firstRow.wholesaleDiscount !== undefined
      ) {
        const discountTypeId = discountTypeMap.get(
          discountMappings["wholesale"].toLowerCase(),
        );
        if (discountTypeId) {
          discounts.push({
            discountTypeId,
            discountPercentage: firstRow.wholesaleDiscount,
            isActive: true,
          });
        }
      }

      const product = await prisma.product.create({
        data: {
          tenantId,
          imsCode: firstRow.imsCode,
          name: firstRow.name,
          categoryId: categoryId!,
          locationId: firstRow.locationId,
          description: firstRow.material || null,
          length: firstRow.length,
          breadth: firstRow.breadth,
          height: firstRow.height,
          weight: firstRow.weight,
          costPrice: firstRow.costPrice,
          mrp: firstRow.finalSP,
          createdById: userId,
          variations: { create: productVariations },
          discounts: discounts.length > 0 ? { create: discounts } : undefined,
        },
        include: {
          category: true,
          variations: true,
          discounts: { include: { discountType: true } },
        },
      });

      const variationByColor = new Map(
        product.variations.map((v) => [v.color.toLowerCase(), v]),
      );
      for (const variationRow of variations) {
        const variation = variationByColor.get(
          variationRow.variation.toLowerCase(),
        );
        if (!variation) continue;
        const qty = variationRow.quantity ?? 0;
        const existing = await prisma.locationInventory.findFirst({
          where: {
            locationId: variationRow.locationId,
            variationId: variation.id,
            subVariationId: null,
          },
        });
        if (existing) {
          await prisma.locationInventory.update({
            where: { id: existing.id },
            data: { quantity: qty },
          });
        } else {
          await prisma.locationInventory.create({
            data: {
              locationId: variationRow.locationId,
              variationId: variation.id,
              subVariationId: null,
              quantity: qty,
            },
          });
        }
      }

      createdProducts.push({
        id: product.id,
        imsCode: product.imsCode,
        name: product.name,
        locationId: product.locationId,
        variationsCount: product.variations?.length || 0,
      });
    } catch (error: unknown) {
      const rowNum =
        rowsWithLocation.indexOf(firstRow) >= 0
          ? rowsWithLocation.indexOf(firstRow) + 2
          : 2;
      errors.push({
        row: rowNum,
        message: (error as Error).message || "Error creating product",
      });
      skippedProducts.push({
        imsCode: firstRow.imsCode,
        name: firstRow.name,
        reason: (error as Error).message || "Error creating product",
      });
    }
  }

  return {
    summary: {
      total: productGroups.size,
      created: createdProducts.length,
      updated: updatedProducts.length,
      skipped: skippedProducts.length,
      errors: errors.length,
    },
    created: createdProducts,
    updated: updatedProducts,
    skipped: skippedProducts,
    errors,
  };
}
