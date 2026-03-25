import ExcelJS from "exceljs";
import { parseAndValidatePhone } from "@/utils/phone";
import type { ExcelSaleRow } from "./bulkUpload.validation";
import type { ValidationError } from "@/utils/bulkParse";
import {
  findLocationsShowrooms,
  findAllUsersForBulk,
  findProductsByTenant,
  findVariationsByTenant,
  findSaleByIdMinimal,
  findMemberByPhone,
  createMember,
  createSaleBulk,
} from "./sale.repository";
import tenantSettingsService from "@/modules/tenant-settings/tenant-settings.service";

export interface ProcessSaleBulkContext {
  tenantId: string;
}

export interface ProcessSaleBulkResult {
  created: Array<{
    id: string;
    saleCode: string;
    itemsCount: number;
  }>;
  skipped: Array<{ saleId: string | null; reason: string }>;
  errors: ValidationError[];
}

function generateSaleCode(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SL-${dateStr}-${random}`;
}

/**
 * Process parsed sale bulk rows: group by sale, resolve showroom/user/member,
 * resolve variations, create sales and items.
 */
export async function processSaleBulkRows(
  rows: ExcelSaleRow[],
  context: ProcessSaleBulkContext,
): Promise<ProcessSaleBulkResult> {
  const { tenantId } = context;
  const created: ProcessSaleBulkResult["created"] = [];
  const skipped: ProcessSaleBulkResult["skipped"] = [];
  const errors: ValidationError[] = [];

  const { paymentMethods } =
    await tenantSettingsService.getPaymentMethods(tenantId);
  const enabledMethodCodes = new Set(
    paymentMethods
      .filter((method) => method.enabled)
      .map((method) => method.code),
  );

  const saleGroups = new Map<
    string,
    {
      saleId: string | null;
      dateOfSale: Date | null;
      showroom: string;
      soldBy: string;
      rows: ExcelSaleRow[];
    }
  >();

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

  const [allLocations, allUsers, allProducts, allVariations] =
    await Promise.all([
      findLocationsShowrooms(tenantId),
      findAllUsersForBulk(tenantId),
      findProductsByTenant(tenantId),
      findVariationsByTenant(tenantId),
    ]);

  const locationMap = new Map(
    allLocations.map((loc) => [loc.name.toLowerCase(), loc.id]),
  );
  const userMap = new Map(
    allUsers.map((u) => [u.username.toLowerCase(), u.id]),
  );
  const variationsByProductIms = new Map<
    string,
    (typeof allVariations)[number][]
  >();
  for (const v of allVariations) {
    const code = (v.product as { imsCode?: string }).imsCode?.toLowerCase();
    if (code) {
      const list = variationsByProductIms.get(code) ?? [];
      list.push(v);
      variationsByProductIms.set(code, list);
    }
  }
  const productMapByName = new Map(
    allProducts.map((p) => [p.name.toLowerCase(), p]),
  );

  for (const [, group] of saleGroups.entries()) {
    try {
      if (group.rows.length === 0) continue;

      const firstRow = group.rows[0];

      if (group.saleId) {
        const existingSale = await findSaleByIdMinimal(group.saleId);
        if (existingSale) {
          skipped.push({
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
          skipped.push({
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
          skipped.push({
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
        const parsed = parseAndValidatePhone(phoneVal);
        if (parsed.valid) {
          let member = await findMemberByPhone(parsed.e164);
          if (!member) {
            member = await createMember({
              tenantId,
              phone: parsed.e164,
            });
          }
          memberId = member.id;
          saleType = "MEMBER";
        }
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

        const variationList = variationsByProductIms.get(imsCodeLower);
        let variation: (typeof allVariations)[number] | undefined;
        if (variationList?.length === 1) {
          variation = variationList[0];
        } else if (variationList && variationList.length > 1) {
          const variationId = (itemRow as { variationId?: string }).variationId;
          if (variationId) {
            variation = variationList.find((v) => v.id === variationId);
          }
          if (!variation) {
            variation = variationList[0];
          }
        }

        if (!variation) {
          errors.push({
            row: rows.indexOf(itemRow) + 2,
            field: "productImsCode",
            message: `Product with product code "${itemRow.productImsCode}" not found for "${itemRow.productName}"`,
            value: itemRow.productImsCode,
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
        skipped.push({
          saleId: group.saleId,
          reason: "No valid items found for this sale",
        });
        continue;
      }

      const total = subtotal - totalDiscount;

      const paymentMethods = group.rows
        .map((r) => r.paymentMethod)
        .filter(
          (method): method is string => method !== null && method !== undefined,
        );
      const paymentMethod =
        paymentMethods.length > 0 ? paymentMethods[0] : "CASH";

      if (!enabledMethodCodes.has(paymentMethod)) {
        errors.push({
          row: rows.indexOf(firstRow) + 2,
          field: "paymentMethod",
          message: `Unsupported payment method "${paymentMethod}" for this tenant`,
          value: paymentMethod,
        });
        skipped.push({
          saleId: group.saleId,
          reason: `Unsupported payment method "${paymentMethod}"`,
        });
        continue;
      }

      const sale = await createSaleBulk({
        tenantId,
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
        items: saleItems,
        paymentMethod,
      });

      created.push({
        id: sale.id,
        saleCode: sale.saleCode,
        itemsCount: sale.items.length,
      });
    } catch (error: unknown) {
      const err = error as Error;
      errors.push({
        row: rows.indexOf(group.rows[0]) + 2,
        message: err.message || "Error creating sale",
      });
      skipped.push({
        saleId: group.saleId,
        reason: err.message || "Error creating sale",
      });
    }
  }

  return { created, skipped, errors };
}

const SALES_TEMPLATE_HEADERS = [
  { header: "SN", width: 8 },
  { header: "Sale ID (UUID)", width: 18 },
  { header: "Date of Sale", width: 14 },
  { header: "Showroom", width: 15 },
  { header: "Phone", width: 14 },
  { header: "Sold By", width: 14 },
  { header: "Product Code", width: 18 },
  { header: "Product Name", width: 22 },
  { header: "Attributes", width: 22 },
  { header: "Quantity", width: 10 },
  { header: "MRP", width: 10 },
  { header: "Discount", width: 10 },
  { header: "Final Amount", width: 14 },
  { header: "Payment Method", width: 18 },
];

const SALES_TEMPLATE_REQUIRED_OPTIONAL = [
  "Optional",
  "Optional",
  "Optional",
  "Required",
  "Optional",
  "Required",
  "Required",
  "Required",
  "Optional (e.g. Red / M)",
  "Required",
  "Required",
  "Optional",
  "Required",
  "Optional (e.g. CASH, CARD, BANK_TRANSFER)",
];

/** Build the sales bulk upload Excel template. Returns buffer. */
export async function buildSaleBulkTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sales Template");

  worksheet.columns = SALES_TEMPLATE_HEADERS.map((h) => ({
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
  SALES_TEMPLATE_REQUIRED_OPTIONAL.forEach((text, i) => {
    row2.getCell(i + 1).value = text;
  });
  row2.font = { italic: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
