import ExcelJS from "exceljs";
import productRepository from "./product.repository";
import type { ExcelProductRow } from "./bulkUpload.validation";
import type { ValidationError } from "@/utils/bulkParse";

export interface ProcessProductBulkContext {
  tenantId: string;
  userId: string;
}

export interface ProcessProductBulkResult {
  created: Array<{
    id: string;
    imsCode: string;
    name: string;
    variationsCount: number;
  }>;
  updated: Array<{
    imsCode: string;
    name: string;
    locations: string[];
    inventoryRowsUpdated: number;
  }>;
  skipped: Array<{ imsCode: string; name: string; reason: string }>;
  errors: ValidationError[];
}

type RowWithLocation = ExcelProductRow & {
  locationId: string;
  vendorId?: string | null;
};

/**
 * Process parsed product bulk rows: resolve locations, group by product,
 * create/update products and variations, apply inventory. Discounts are not uploaded; add them manually later.
 */
export async function processProductBulkRows(
  rows: ExcelProductRow[],
  context: ProcessProductBulkContext,
): Promise<ProcessProductBulkResult> {
  const { tenantId, userId } = context;
  const created: ProcessProductBulkResult["created"] = [];
  const updated: ProcessProductBulkResult["updated"] = [];
  const skipped: ProcessProductBulkResult["skipped"] = [];
  const errors: ValidationError[] = [];

  const [allCategories, allLocations, allVendors] = await Promise.all([
    productRepository.findCategoriesByTenant(tenantId),
    productRepository.findLocationsByTenant(tenantId),
    productRepository.findVendorsByTenant(tenantId),
  ]);

  const categoryMap = new Map(
    allCategories.map((cat) => [cat.name.toLowerCase(), cat.id]),
  );
  const locationByNameMap = new Map(
    allLocations.map((loc) => [loc.name.toLowerCase().trim(), loc.id]),
  );
  const locationByIdMap = new Map(allLocations.map((loc) => [loc.id, loc.id]));
  const vendorByNameMap = new Map(
    allVendors.map((v) => [v.name.toLowerCase().trim(), v.id]),
  );
  const vendorByIdMap = new Map(allVendors.map((v) => [v.id, v.id]));

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
    let vendorId: string | null | undefined = null;
    if (row.vendor != null && String(row.vendor).trim() !== "") {
      const vendorInput = String(row.vendor).trim();
      const resolvedVendorId =
        vendorByIdMap.get(vendorInput) ??
        vendorByNameMap.get(vendorInput.toLowerCase());
      if (!resolvedVendorId) {
        errors.push({
          row: i + 2,
          field: "vendor",
          message: `row ${i + 2} vendor not found`,
          value: vendorInput,
        });
        continue;
      }
      vendorId = resolvedVendorId;
    }
    rowsWithLocation.push({ ...row, locationId, vendorId });
  }

  const productGroups = new Map<
    string,
    { product: RowWithLocation; variations: RowWithLocation[] }
  >();

  rowsWithLocation.forEach((row) => {
    const key = `${row.category.trim().toLowerCase()}|${row.name.trim().toLowerCase()}`;
    if (!productGroups.has(key)) {
      productGroups.set(key, { product: row, variations: [] });
    }
    productGroups.get(key)!.variations.push(row);
  });

  const ensureAttributeTypeAndValue = async (
    tenantId: string,
    attrName: string,
    value: string,
  ): Promise<{ attributeTypeId: string; attributeValueId: string }> => {
    const code = attrName.trim().toLowerCase().replace(/\s+/g, "_");
    const nameTrim = attrName.trim();
    const valueTrim = value.trim();
    let attrType = await productRepository.findAttributeTypeByCode(
      tenantId,
      code,
    );
    if (!attrType) {
      attrType = await productRepository.createAttributeType(
        tenantId,
        nameTrim,
        code || "attr",
      );
    }
    let attrVal = await productRepository.findAttributeValueByTypeAndValue(
      attrType.id,
      valueTrim,
    );
    if (!attrVal) {
      attrVal = await productRepository.createAttributeValue(
        attrType.id,
        valueTrim,
      );
    }
    return {
      attributeTypeId: attrType.id,
      attributeValueId: attrVal.id,
    };
  };

  const resolveAttributePairs = async (
    tenantId: string,
    attributesStr: string,
    valuesStr: string,
  ): Promise<Array<{ attributeTypeId: string; attributeValueId: string }>> => {
    const attrNames = attributesStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const vals = valuesStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const pairs: Array<{
      attributeTypeId: string;
      attributeValueId: string;
    }> = [];
    for (let i = 0; i < attrNames.length && i < vals.length; i++) {
      const pair = await ensureAttributeTypeAndValue(
        tenantId,
        attrNames[i]!,
        vals[i]!,
      );
      pairs.push(pair);
    }
    return pairs;
  };

  for (const [, group] of productGroups.entries()) {
    const firstRow = group.product;
    const variations = group.variations;

    try {
      let categoryId = categoryMap.get(firstRow.category.toLowerCase());
      const categoryNameOriginal = firstRow.category.trim();
      const categoryNameLower = firstRow.category.toLowerCase();

      if (!categoryId) {
        let existingCategory =
          await productRepository.findCategoryByName(categoryNameOriginal);
        if (!existingCategory) {
          const allCategoriesSearch =
            await productRepository.findCategoriesByNameContains(
              categoryNameOriginal,
            );
          existingCategory =
            allCategoriesSearch.find(
              (cat) => cat.name.toLowerCase() === categoryNameLower,
            ) || null;
        }

        if (existingCategory) {
          categoryId = existingCategory.id;
          categoryMap.set(categoryNameLower, categoryId);
        } else {
          try {
            const newCategory = await productRepository.createCategory(
              tenantId,
              categoryNameOriginal,
            );
            categoryId = newCategory.id;
            categoryMap.set(categoryNameLower, categoryId);
          } catch (createErr: unknown) {
            const err = createErr as { code?: string };
            if (err.code === "P2002") {
              const foundCategory =
                await productRepository.findCategoryByName(
                  categoryNameOriginal,
                );
              if (foundCategory) {
                categoryId = foundCategory.id;
                categoryMap.set(categoryNameLower, categoryId);
              } else {
                throw createErr;
              }
            } else {
              throw createErr;
            }
          }
        }
      }

      const existingProduct =
        await productRepository.findProductByTenantAndImsOrName(
          tenantId,
          firstRow.imsCode,
          firstRow.name.trim(),
        );

      if (existingProduct) {
        const variationByImsCode = new Map(
          existingProduct.variations.map((v) => [
            v.imsCode.trim().toLowerCase(),
            v,
          ]),
        );
        let inventoryUpserted = 0;
        for (const variationRow of variations) {
          const imsCodeTrim = variationRow.imsCode.trim();
          let variation = variationByImsCode.get(imsCodeTrim.toLowerCase());
          if (!variation) {
            const attributePairs = await resolveAttributePairs(
              tenantId,
              variationRow.attributes,
              variationRow.values,
            );
            const newVariation = await productRepository.createProductVariation(
              {
                tenantId,
                productId: existingProduct.id,
                imsCode: imsCodeTrim,
                stockQuantity: 0,
                attributes: {
                  create: attributePairs.map((p) => ({
                    attributeTypeId: p.attributeTypeId,
                    attributeValueId: p.attributeValueId,
                  })),
                },
              },
            );
            variationByImsCode.set(imsCodeTrim.toLowerCase(), newVariation);
            variation = newVariation;
            const typeIds = [
              ...new Set(attributePairs.map((p) => p.attributeTypeId)),
            ];
            for (const typeId of typeIds) {
              await productRepository.upsertProductAttributeType(
                existingProduct.id,
                typeId,
                0,
              );
            }
          }
          const qty = variationRow.quantity ?? 0;
          if (qty > 0) {
            const existingInv = await productRepository.findLocationInventory(
              variationRow.locationId,
              variation.id,
              null,
            );
            if (existingInv) {
              await productRepository.setLocationInventoryQuantity(
                existingInv.id,
                qty,
              );
            } else {
              await productRepository.createLocationInventory({
                locationId: variationRow.locationId,
                variationId: variation.id,
                subVariationId: null,
                quantity: qty,
              });
            }
            inventoryUpserted++;
          }
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
        updated.push({
          imsCode: existingProduct.variations?.[0]?.imsCode ?? firstRow.imsCode,
          name: existingProduct.name,
          locations: locationNames,
          inventoryRowsUpdated: inventoryUpserted,
        });
        continue;
      }

      const productVariationsData: Array<{
        imsCode: string;
        stockQuantity: number;
        attributePairs: Array<{
          attributeTypeId: string;
          attributeValueId: string;
        }>;
      }> = [];
      for (const row of variations) {
        const attributePairs = await resolveAttributePairs(
          tenantId,
          row.attributes,
          row.values,
        );
        productVariationsData.push({
          imsCode: row.imsCode.trim(),
          stockQuantity: 0,
          attributePairs,
        });
      }

      const product = await productRepository.createProductWithVariations({
        tenantId,
        name: firstRow.name,
        categoryId: categoryId!,
        description: firstRow.description || null,
        length: firstRow.length,
        breadth: firstRow.breadth,
        height: firstRow.height,
        weight: firstRow.weight,
        vendorId: firstRow.vendorId ?? undefined,
        costPrice: firstRow.costPrice,
        mrp: firstRow.finalSP,
        createdById: userId,
        variations: {
          create: productVariationsData.map((v) => ({
            tenantId,
            imsCode: v.imsCode,
            stockQuantity: v.stockQuantity,
            attributes: {
              create: v.attributePairs.map((p) => ({
                attributeTypeId: p.attributeTypeId,
                attributeValueId: p.attributeValueId,
              })),
            },
          })),
        },
      });

      const attributeTypeIds = [
        ...new Set(
          productVariationsData.flatMap((v) =>
            v.attributePairs.map((p) => p.attributeTypeId),
          ),
        ),
      ];
      for (let i = 0; i < attributeTypeIds.length; i++) {
        await productRepository.upsertProductAttributeType(
          product.id,
          attributeTypeIds[i]!,
          i,
        );
      }

      const variationByImsCode = new Map(
        product.variations.map((v) => [v.imsCode.trim().toLowerCase(), v]),
      );
      for (const variationRow of variations) {
        const variation = variationByImsCode.get(
          variationRow.imsCode.trim().toLowerCase(),
        );
        if (!variation) continue;
        const qty = variationRow.quantity ?? 0;
        if (qty === 0) continue;
        const existingInv = await productRepository.findLocationInventory(
          variationRow.locationId,
          variation.id,
          null,
        );
        if (existingInv) {
          await productRepository.setLocationInventoryQuantity(
            existingInv.id,
            qty,
          );
        } else {
          await productRepository.createLocationInventory({
            locationId: variationRow.locationId,
            variationId: variation.id,
            subVariationId: null,
            quantity: qty,
          });
        }
      }

      created.push({
        id: product.id,
        imsCode: product.variations?.[0]?.imsCode ?? firstRow.imsCode,
        name: product.name,
        variationsCount: product.variations?.length || 0,
      });
    } catch (error: unknown) {
      const err = error as Error;
      const rowNum =
        rowsWithLocation.indexOf(firstRow) >= 0
          ? rowsWithLocation.indexOf(firstRow) + 2
          : 2;
      errors.push({
        row: rowNum,
        message: err.message || "Error creating product",
      });
      skipped.push({
        imsCode: firstRow.imsCode,
        name: firstRow.name,
        reason: err.message || "Error creating product",
      });
    }
  }

  return { created, updated, skipped, errors };
}

const PRODUCT_TEMPLATE_HEADERS = [
  { header: "IMS Code", width: 15 },
  { header: "Location", width: 22 },
  { header: "Category", width: 18 },
  { header: "Sub-Category", width: 15 },
  { header: "Name of Product", width: 28 },
  { header: "Attributes", width: 22 },
  { header: "Values", width: 22 },
  { header: "Description", width: 25 },
  { header: "Length", width: 10 },
  { header: "Breadth", width: 10 },
  { header: "Height", width: 10 },
  { header: "Weight", width: 10 },
  { header: "Vendor", width: 15 },
  { header: "Qty", width: 8 },
  { header: "Cost Price", width: 12 },
  { header: "Final SP", width: 12 },
];

const PRODUCT_TEMPLATE_REQUIRED_OPTIONAL = [
  "Required",
  "Required",
  "Required",
  "Optional",
  "Required",
  "Required",
  "Required",
  "Optional",
  "Optional",
  "Optional",
  "Optional",
  "Optional",
  "Optional",
  "Optional",
  "Required",
  "Required",
];

/** Build the product bulk upload Excel template (headers + hint row). Returns buffer. */
export async function buildProductBulkTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Products Template");

  worksheet.columns = PRODUCT_TEMPLATE_HEADERS.map((h) => ({
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
  PRODUCT_TEMPLATE_REQUIRED_OPTIONAL.forEach((text, i) => {
    row2.getCell(i + 1).value = text;
  });
  row2.font = { italic: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
