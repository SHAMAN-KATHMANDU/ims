/**
 * Sales service - all business logic for sales module.
 * Framework-independent, uses repository and handlers.
 */

import prisma from "@/config/prisma";
import ExcelJS from "exceljs";
import type { Prisma } from "@prisma/client";
import { DomainError, NotFoundError } from "@/shared/errors";
import { salesRepository } from "./sales.repository";
import { discountStrategy, promoStrategy, dateRangeStrategy } from "./handlers";
import { AuditAction, AuditResource, type AuthContext } from "@/shared/types";

export function generateSaleCode(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SL-${dateStr}-${random}`;
}

export type PreviewSaleItem = {
  variationId: string;
  subVariationId?: string | null;
  quantity: number;
  promoCode?: string;
};

export type PreviewSaleContext = {
  tenantId: string;
  locationId: string;
  memberPhone?: string;
  memberName?: string;
  items: PreviewSaleItem[];
};

export type PreviewSaleResult = {
  subtotal: number;
  discount: number;
  total: number;
  promoDiscount: number;
};

export type CreateSaleItemInput = {
  variationId: string;
  subVariationId?: string | null;
  quantity: number;
  promoCode?: string;
};

export type CreateSalePaymentInput = {
  method: "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR";
  amount: number;
};

export type CreateSalePayload = {
  locationId: string;
  memberPhone?: string;
  memberName?: string;
  isCreditSale?: boolean;
  items: CreateSaleItemInput[];
  notes?: string;
  payments?: CreateSalePaymentInput[];
};

export async function previewSale(
  ctx: PreviewSaleContext,
): Promise<PreviewSaleResult> {
  const location = await salesRepository.findLocation(
    ctx.locationId,
    ctx.tenantId,
  );
  if (!location || !location.isActive || location.type !== "SHOWROOM") {
    throw new DomainError(400, "Invalid or inactive showroom");
  }

  let member = await salesRepository.findMemberByPhone(
    ctx.tenantId,
    ctx.memberPhone ?? "",
  );
  const saleType: "GENERAL" | "MEMBER" =
    member?.isActive === true ? "MEMBER" : "GENERAL";

  let subtotal = 0;
  let totalDiscount = 0;
  let totalPromoDiscount = 0;

  for (const item of ctx.items) {
    const variation = await salesRepository.findVariationWithDiscounts(
      item.variationId,
    );
    if (!variation) {
      throw new NotFoundError(`Variation ${item.variationId} not found`);
    }

    const prevSubVariationId = item.subVariationId ?? null;
    const prevHasSubVariants = (variation.subVariations?.length ?? 0) > 0;
    if (prevHasSubVariants && !prevSubVariationId) {
      throw new DomainError(
        400,
        `Variation ${variation.color} has sub-variants; specify subVariationId`,
      );
    }

    const inventory = await salesRepository.findInventory(
      ctx.locationId,
      item.variationId,
      prevSubVariationId,
    );
    const availableStock = inventory?.quantity ?? 0;
    if (availableStock < item.quantity) {
      throw new DomainError(
        400,
        `Insufficient stock for ${variation.product.name} (${variation.color})`,
      );
    }

    const unitPrice = Number(variation.product.mrp);
    const itemSubtotal = unitPrice * item.quantity;
    const { discountAmount: baseAmount, discountPercent: basePercent } =
      discountStrategy.selectBaseDiscount(variation, saleType, itemSubtotal);

    let discountAmount = baseAmount;
    let discountPercent = basePercent;

    if (item.promoCode) {
      const promo = await salesRepository.findPromoByCode(
        ctx.tenantId,
        item.promoCode,
      );
      if (promo?.isActive) {
        const now = new Date();
        const validDate =
          (!promo.validFrom || promo.validFrom <= now) &&
          (!promo.validTo || promo.validTo >= now);
        const underLimit =
          !promo.usageLimit || promo.usageCount < promo.usageLimit;

        if (validDate && underLimit) {
          const isProductEligible = promoStrategy.isProductEligible(
            promo,
            variation.productId,
          );
          const isCustomerEligible = promoStrategy.isCustomerEligible(
            promo,
            saleType,
          );

          if (isProductEligible && isCustomerEligible) {
            const baseAfterProductDiscount =
              itemSubtotal -
              (discountAmount + itemSubtotal * (discountPercent / 100));
            const promoDiscountAmount =
              promo.valueType === "FLAT"
                ? Number(promo.value)
                : baseAfterProductDiscount * (Number(promo.value) / 100);

            const basePercentValue = itemSubtotal * (discountPercent / 100);
            const promoResult = promoStrategy.apply(promo, {
              promoAmount: promoDiscountAmount,
              baseAmount: discountAmount,
              basePercent: discountPercent,
              basePercentValue,
              itemSubtotal,
            });

            discountAmount = promoResult.discountAmount;
            discountPercent = promoResult.discountPercent;
            totalPromoDiscount += Math.min(promoResult.amount, itemSubtotal);
          }
        }
      }
    }

    const effectiveDiscount =
      Math.min(
        itemSubtotal,
        discountAmount + itemSubtotal * (discountPercent / 100),
      ) || 0;
    subtotal += itemSubtotal;
    totalDiscount += effectiveDiscount;
  }

  const total = Math.round((subtotal - totalDiscount) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(totalDiscount * 100) / 100,
    total,
    promoDiscount: Math.round(totalPromoDiscount * 100) / 100,
  };
}

export async function createSale(
  payload: CreateSalePayload,
  auth: AuthContext,
  auditMeta?: { ip?: string; userAgent?: string },
) {
  const { tenantId, userId } = auth;
  const {
    locationId,
    memberPhone,
    memberName,
    isCreditSale,
    items,
    notes,
    payments,
  } = payload;

  const location = await salesRepository.findLocation(locationId, tenantId);
  if (!location) throw new NotFoundError("Location not found");
  if (!location.isActive) throw new DomainError(400, "Location is inactive");
  if (location.type !== "SHOWROOM") {
    throw new DomainError(
      400,
      "Sales can only be made at showrooms, not warehouses",
    );
  }

  let member: {
    id: string;
    isActive: boolean;
    createdAt: Date;
    firstPurchase: Date | null;
  } | null = await salesRepository.findMemberByPhone(
    tenantId,
    memberPhone ?? "",
  );
  let saleType: "GENERAL" | "MEMBER" = "GENERAL";

  if (memberPhone) {
    const normalizedPhone = memberPhone.replace(/[\s-]/g, "").trim();
    if (!member) {
      member = await salesRepository.createMember({
        tenantId,
        phone: normalizedPhone,
        name: memberName?.trim(),
      });
    }
    if (member.isActive) saleType = "MEMBER";
  }

  if (isCreditSale === true && !member) {
    throw new DomainError(
      400,
      "Credit sales require a customer (member). Please enter the customer's phone number.",
    );
  }

  type ProcessedItem = {
    variationId: string;
    subVariationId: string | null;
    quantity: number;
    unitPrice: number;
    totalMrp: number;
    discountPercent: number;
    discountAmount: number;
    lineTotal: number;
  };

  const processedItems: ProcessedItem[] = [];
  let subtotal = 0;
  let totalDiscount = 0;

  for (const item of items) {
    const variation = await salesRepository.findVariationWithDiscounts(
      item.variationId,
    );
    if (!variation) {
      throw new NotFoundError(
        `Product variation ${item.variationId} not found`,
      );
    }

    const hasSubVariants = variation.subVariations?.length > 0;
    const subVariationId = item.subVariationId ?? null;
    if (hasSubVariants && !subVariationId) {
      throw new DomainError(
        400,
        `Variation ${variation.color} has sub-variants; please specify subVariationId for each line item`,
      );
    }
    if (!hasSubVariants && subVariationId) {
      throw new DomainError(
        400,
        `Variation ${variation.color} has no sub-variants; do not send subVariationId`,
      );
    }

    const inventory = await salesRepository.findInventory(
      locationId,
      item.variationId,
      subVariationId,
    );
    const availableStock = inventory?.quantity ?? 0;
    if (availableStock < item.quantity) {
      throw new DomainError(400, "Insufficient stock", undefined);
    }

    const unitPrice = Number(variation.product.mrp);
    const itemSubtotal = unitPrice * item.quantity;
    let discountAmount = 0;
    let discountPercent = 0;

    const { discountAmount: baseAmount, discountPercent: basePercent } =
      discountStrategy.selectBaseDiscount(variation, saleType, itemSubtotal);
    discountAmount = baseAmount;
    discountPercent = basePercent;

    if (item.promoCode) {
      const promo = await salesRepository.findPromoByCode(
        tenantId,
        item.promoCode,
      );
      if (promo?.isActive) {
        const now = new Date();
        const validDate =
          (!promo.validFrom || promo.validFrom <= now) &&
          (!promo.validTo || promo.validTo >= now);
        const underLimit =
          !promo.usageLimit || promo.usageCount < promo.usageLimit;

        if (validDate && underLimit) {
          const isProductEligible = promoStrategy.isProductEligible(
            promo,
            variation.productId,
          );
          const isCustomerEligible = promoStrategy.isCustomerEligible(
            promo,
            saleType,
          );

          if (isProductEligible && isCustomerEligible) {
            const baseAfterProductDiscount =
              itemSubtotal -
              (discountAmount + itemSubtotal * (discountPercent / 100));
            const promoDiscountAmount =
              promo.valueType === "FLAT"
                ? Number(promo.value)
                : baseAfterProductDiscount * (Number(promo.value) / 100);

            const promoResult = promoStrategy.apply(promo, {
              promoAmount: promoDiscountAmount,
              baseAmount: discountAmount,
              basePercent: discountPercent,
              basePercentValue: itemSubtotal * (discountPercent / 100),
              itemSubtotal,
            });

            discountAmount = promoResult.discountAmount;
            discountPercent = promoResult.discountPercent;

            await salesRepository.incrementPromoUsage(promo.id);
          }
        }
      }
    }

    const effectiveDiscount =
      Math.min(
        itemSubtotal,
        discountAmount + itemSubtotal * (discountPercent / 100),
      ) || 0;
    const lineTotal = itemSubtotal - effectiveDiscount;

    subtotal += itemSubtotal;
    totalDiscount += effectiveDiscount;

    processedItems.push({
      variationId: item.variationId,
      subVariationId: subVariationId ?? null,
      quantity: item.quantity,
      unitPrice,
      totalMrp: itemSubtotal,
      discountPercent,
      discountAmount: effectiveDiscount,
      lineTotal,
    });
  }

  const total = Math.round((subtotal - totalDiscount) * 100) / 100;
  const creditSale = isCreditSale === true;

  if (!creditSale && payments?.length) {
    const paymentSum =
      Math.round(
        payments.reduce((sum, p) => sum + Number(p.amount || 0), 0) * 100,
      ) / 100;
    if (Math.abs(paymentSum - total) > 0.01) {
      throw new DomainError(
        400,
        "Sum of payment sources must match final total (after discounts)",
      );
    }
  }

  const sale = await prisma.$transaction(async (tx) => {
    const newSale = await tx.sale.create({
      data: {
        tenantId,
        saleCode: generateSaleCode(),
        type: saleType,
        isCreditSale: creditSale,
        locationId,
        memberId: member?.id ?? null,
        subtotal,
        discount: totalDiscount,
        total,
        notes: notes ?? null,
        createdById: userId,
        items: {
          create: processedItems.map((it) => ({
            variationId: it.variationId,
            subVariationId: it.subVariationId ?? undefined,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalMrp: it.totalMrp,
            discountPercent: it.discountPercent,
            discountAmount: it.discountAmount,
            lineTotal: it.lineTotal,
          })),
        },
        payments: payments?.length
          ? {
              create: payments.map((p) => ({
                method: p.method,
                amount: p.amount,
              })),
            }
          : undefined,
      },
      include: {
        location: { select: { id: true, name: true } },
        member: { select: { id: true, phone: true, name: true } },
        createdBy: { select: { id: true, username: true } },
        items: {
          include: {
            variation: {
              include: {
                product: { select: { id: true, name: true, imsCode: true } },
              },
            },
            subVariation: { select: { id: true, name: true } },
          },
        },
        payments: true,
      },
    });

    for (const it of processedItems) {
      await salesRepository.updateInventoryDecrement({
        locationId,
        variationId: it.variationId,
        subVariationId: it.subVariationId,
        quantity: it.quantity,
        tx,
      });
    }

    return newSale;
  });

  if (member) {
    try {
      await salesRepository.updateMemberStats(member.id, {
        totalSales: total,
        memberSince: member.createdAt ?? new Date(),
        firstPurchase: member.firstPurchase ?? new Date(),
      });
    } catch {
      // Non-fatal
    }
  }

  try {
    await salesRepository.createAuditLog({
      tenantId,
      userId,
      action: AuditAction.CREATE_SALE,
      resource: AuditResource.SALE,
      resourceId: sale.id,
      details: {
        saleCode: sale.saleCode,
        total: Number(sale.total),
        locationId: sale.locationId,
      },
      ip: auditMeta?.ip,
      userAgent: auditMeta?.userAgent,
    });
  } catch {
    // Non-fatal
  }

  return sale;
}

export type GetAllSalesParams = {
  tenantId: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  search?: string;
  locationId?: string;
  type?: "GENERAL" | "MEMBER";
  isCreditSale?: boolean;
  startDate?: string;
  endDate?: string;
  createdById?: string;
  userRole?: string;
  userId?: string;
};

export async function getAllSales(params: GetAllSalesParams) {
  const { startDate, endDate } = dateRangeStrategy.clampForRole(
    params.userRole,
    params.startDate,
    params.endDate,
  );

  const where: Prisma.SaleWhereInput = { tenantId: params.tenantId };
  if (params.locationId) where.locationId = params.locationId;
  if (params.type) where.type = params.type;
  if (params.isCreditSale !== undefined)
    where.isCreditSale = params.isCreditSale;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (params.search) {
    where.OR = [
      { saleCode: { contains: params.search, mode: "insensitive" } },
      { member: { phone: { contains: params.search, mode: "insensitive" } } },
      { member: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  if (params.userRole === "user" && params.userId) {
    where.createdById = params.userId;
  } else if (params.createdById) {
    where.createdById = params.createdById;
  }

  const allowedSortFields = [
    "createdAt",
    "total",
    "subtotal",
    "discount",
    "saleCode",
    "type",
    "id",
  ];
  const orderByField = allowedSortFields.includes(params.sortBy)
    ? params.sortBy
    : "createdAt";
  const orderBy = {
    [orderByField]: params.sortOrder,
  } as Prisma.SaleOrderByWithRelationInput;

  const skip = (params.page - 1) * params.limit;

  const [totalItems, sales] = await Promise.all([
    salesRepository.countSales(where),
    salesRepository.findSales({ where, orderBy, skip, take: params.limit }),
  ]);

  return { sales, totalItems };
}

export async function getSaleById(id: string) {
  const sale = await salesRepository.findSaleById(id);
  if (!sale) throw new NotFoundError("Sale not found");
  return sale;
}

export type AddPaymentParams = {
  saleId: string;
  method: string;
  amount: number;
};

export async function addPayment(params: AddPaymentParams) {
  const sale = await salesRepository.findSaleById(params.saleId);
  if (!sale) throw new NotFoundError("Sale not found");
  if (!sale.isCreditSale) {
    throw new DomainError(400, "Payments can only be added to credit sales");
  }

  const amountPaid =
    sale.payments.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalNum = Number(sale.total);
  const balanceDue = Math.round((totalNum - amountPaid) * 100) / 100;

  if (params.amount > balanceDue + 0.01) {
    throw new DomainError(400, "Payment amount exceeds balance due");
  }

  await salesRepository.createSalePayment({
    saleId: params.saleId,
    method: params.method,
    amount: params.amount,
  });

  return salesRepository.findSaleById(params.saleId);
}

export async function getDailySales(params: {
  tenantId: string;
  locationId?: string;
  days?: number;
}) {
  const days = params.days ?? 30;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const where: Prisma.SaleWhereInput = {
    tenantId: params.tenantId,
    createdAt: { gte: startDate, lte: endDate },
  };
  if (params.locationId) where.locationId = params.locationId;

  const sales = await prisma.sale.findMany({
    where,
    select: { total: true, type: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const dailyData: Record<
    string,
    {
      date: string;
      total: number;
      count: number;
      general: number;
      member: number;
    }
  > = {};

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    dailyData[dateStr] = {
      date: dateStr,
      total: 0,
      count: 0,
      general: 0,
      member: 0,
    };
  }

  for (const sale of sales) {
    const dateStr = sale.createdAt.toISOString().slice(0, 10);
    if (dailyData[dateStr]) {
      dailyData[dateStr].total += Number(sale.total);
      dailyData[dateStr].count += 1;
      if (sale.type === "GENERAL") {
        dailyData[dateStr].general += Number(sale.total);
      } else {
        dailyData[dateStr].member += Number(sale.total);
      }
    }
  }

  return Object.values(dailyData);
}

export type DownloadSalesParams = {
  tenantId: string;
  format: "excel" | "csv";
  saleIds?: string[];
};

export type DownloadSalesResult = {
  buffer: Buffer | string;
  contentType: string;
  filename: string;
};

export async function downloadSales(
  params: DownloadSalesParams,
): Promise<DownloadSalesResult> {
  const where: Prisma.SaleWhereInput = { tenantId: params.tenantId };
  if (params.saleIds && params.saleIds.length > 0) {
    where.id = { in: params.saleIds };
  }

  const sales = await salesRepository.findSalesForExport(where);
  if (sales.length === 0) {
    throw new NotFoundError("No sales found to export");
  }

  const paymentSummary = (sale: (typeof sales)[0]) =>
    sale.payments.map((p) => `${p.method}: ${Number(p.amount)}`).join("; ") ||
    "N/A";

  type ExportRow = {
    saleCode: string;
    type: string;
    location: string;
    memberPhone: string;
    memberName: string;
    createdBy: string;
    date: string;
    notes: string;
    subtotal: number;
    discount: number;
    total: number;
    paymentSummary: string;
    productImsCode: string;
    productName: string;
    category: string;
    variation: string;
    quantity: number;
    unitPrice: number;
    totalMrp: number;
    discountPercent: number;
    discountAmount: number;
    lineTotal: number;
  };

  const exportRows: ExportRow[] = [];
  for (const sale of sales) {
    const saleContext = {
      saleCode: sale.saleCode,
      type: sale.type,
      location: sale.location.name,
      memberPhone: sale.member?.phone ?? "Walk-in",
      memberName: sale.member?.name ?? "N/A",
      createdBy: sale.createdBy.username,
      date: new Date(sale.createdAt).toLocaleString(),
      notes: sale.notes ?? "N/A",
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      total: Number(sale.total),
      paymentSummary: paymentSummary(sale),
    };
    if (sale.items.length === 0) {
      exportRows.push({
        ...saleContext,
        productImsCode: "",
        productName: "",
        category: "",
        variation: "",
        quantity: 0,
        unitPrice: 0,
        totalMrp: 0,
        discountPercent: 0,
        discountAmount: 0,
        lineTotal: 0,
      });
    } else {
      for (const item of sale.items) {
        const product = item.variation.product;
        exportRows.push({
          ...saleContext,
          productImsCode: product.imsCode,
          productName: product.name,
          category: product.category?.name ?? "",
          variation: item.variation.color,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalMrp: Number(item.totalMrp),
          discountPercent: Number(item.discountPercent),
          discountAmount: Number(item.discountAmount),
          lineTotal: Number(item.lineTotal),
        });
      }
    }
  }

  const columns = [
    { header: "Sale Code", key: "saleCode", width: 20 },
    { header: "Type", key: "type", width: 12 },
    { header: "Location", key: "location", width: 25 },
    { header: "Member Phone", key: "memberPhone", width: 15 },
    { header: "Member Name", key: "memberName", width: 25 },
    { header: "Created By", key: "createdBy", width: 20 },
    { header: "Date", key: "date", width: 20 },
    { header: "Notes", key: "notes", width: 35 },
    { header: "Subtotal", key: "subtotal", width: 12 },
    { header: "Discount", key: "discount", width: 12 },
    { header: "Total", key: "total", width: 12 },
    { header: "Payment Summary", key: "paymentSummary", width: 30 },
    { header: "Product IMS Code", key: "productImsCode", width: 18 },
    { header: "Product Name", key: "productName", width: 30 },
    { header: "Category", key: "category", width: 18 },
    { header: "Variation", key: "variation", width: 15 },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Unit Price", key: "unitPrice", width: 12 },
    { header: "Total MRP", key: "totalMrp", width: 12 },
    { header: "Discount %", key: "discountPercent", width: 10 },
    { header: "Discount Amount", key: "discountAmount", width: 14 },
    { header: "Line Total", key: "lineTotal", width: 12 },
  ];

  const timestamp = new Date().toISOString().split("T")[0];
  const ext = params.format === "excel" ? "xlsx" : "csv";
  const filename = `sales_${timestamp}.${ext}`;

  if (params.format === "excel") {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales");
    worksheet.columns = columns;
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
    exportRows.forEach((row) => worksheet.addRow(row));
    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buffer),
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename,
    };
  }

  const escapeCsvValue = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvHeaders = columns.map((c) => c.header);
  const csvRows: string[] = [
    csvHeaders.map(escapeCsvValue).join(","),
    ...exportRows.map((row) =>
      [
        row.saleCode,
        row.type,
        row.location,
        row.memberPhone,
        row.memberName,
        row.createdBy,
        row.date,
        row.notes,
        row.subtotal,
        row.discount,
        row.total,
        row.paymentSummary,
        row.productImsCode,
        row.productName,
        row.category,
        row.variation,
        row.quantity,
        row.unitPrice,
        row.totalMrp,
        row.discountPercent,
        row.discountAmount,
        row.lineTotal,
      ]
        .map(escapeCsvValue)
        .join(","),
    ),
  ];
  return {
    buffer: csvRows.join("\n"),
    contentType: "text/csv; charset=utf-8",
    filename,
  };
}

export type GetSalesSummaryParams = {
  tenantId: string;
  locationId?: string;
  startDate?: string;
  endDate?: string;
};

export async function getSalesSummary(params: GetSalesSummaryParams) {
  const where: Prisma.SaleWhereInput = { tenantId: params.tenantId };
  if (params.locationId) where.locationId = params.locationId;

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (params.startDate) dateFilter.gte = new Date(params.startDate);
  if (params.endDate) {
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }
  if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;

  const [totalStats, generalStats, memberStats] = await Promise.all([
    salesRepository.aggregateSales({
      where,
      _sum: { total: true },
      _count: true,
    }),
    salesRepository.aggregateSales({
      where: { ...where, type: "GENERAL" },
      _sum: { total: true },
      _count: true,
    }),
    salesRepository.aggregateSales({
      where: { ...where, type: "MEMBER" },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  return {
    totalSales: totalStats._count,
    totalRevenue: Number(totalStats._sum?.total) || 0,
    totalDiscount: Number(totalStats._sum?.discount) || 0,
    generalSales: {
      count: generalStats._count,
      revenue: Number(generalStats._sum?.total) || 0,
    },
    memberSales: {
      count: memberStats._count,
      revenue: Number(memberStats._sum?.total) || 0,
    },
  };
}

export type GetSalesByLocationParams = {
  tenantId: string;
  startDate?: string;
  endDate?: string;
};

export async function getSalesByLocation(params: GetSalesByLocationParams) {
  const where: Prisma.SaleWhereInput = { tenantId: params.tenantId };

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (params.startDate) dateFilter.gte = new Date(params.startDate);
  if (params.endDate) {
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }
  if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;

  const locations = await prisma.location.findMany({
    where: { tenantId: params.tenantId, type: "SHOWROOM", isActive: true },
    select: { id: true, name: true },
  });

  const locationStats = await Promise.all(
    locations.map(async (location) => {
      const stats = await salesRepository.aggregateSales({
        where: { ...where, locationId: location.id },
        _sum: { total: true },
        _count: true,
      });
      return {
        locationId: location.id,
        locationName: location.name,
        totalSales: stats._count,
        totalRevenue: Number(stats._sum?.total) || 0,
      };
    }),
  );

  return locationStats;
}

export type GetSalesSinceLastLoginParams = {
  userId: string;
  page: number;
  limit: number;
};

export async function getSalesSinceLastLogin(
  params: GetSalesSinceLastLoginParams,
) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { lastLoginAt: true },
  });
  if (!user) throw new NotFoundError("User not found");

  const since = user.lastLoginAt ?? new Date(0);

  const where: Prisma.SaleWhereInput = {
    createdById: params.userId,
    createdAt: { gte: since },
  };

  const skip = (params.page - 1) * params.limit;

  const [totalItems, sales] = await Promise.all([
    salesRepository.countSales(where),
    salesRepository.findSales({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: params.limit,
    }),
  ]);

  return { sales, totalItems };
}
