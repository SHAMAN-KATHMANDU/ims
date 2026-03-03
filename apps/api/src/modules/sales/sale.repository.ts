/**
 * Sale Repository — ONLY layer that imports prisma.
 * All data access for sales, locations, members, inventory, etc.
 * Exposes filter-based methods so service never needs Prisma types.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

// ─── Filter params (Prisma-agnostic, for service layer) ───────────────────

export interface SaleListFilterParams {
  locationId?: string;
  createdById?: string;
  type?: "GENERAL" | "MEMBER";
  isCreditSale?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface SaleListPaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface SaleDateFilterParams {
  locationId?: string;
  startDate?: string;
  endDate?: string;
}

export interface SaleExportFilterParams {
  ids?: string[];
}

const ALLOWED_SORT_FIELDS = [
  "createdAt",
  "total",
  "subtotal",
  "discount",
  "saleCode",
  "type",
  "id",
] as const;

function buildSaleWhereFromFilter(
  filter: SaleListFilterParams,
): Prisma.SaleWhereInput {
  const where: Prisma.SaleWhereInput = {};

  if (filter.locationId) where.locationId = filter.locationId;
  if (filter.type) where.type = filter.type;
  if (filter.isCreditSale === true) where.isCreditSale = true;
  else if (filter.isCreditSale === false) where.isCreditSale = false;

  if (filter.startDate || filter.endDate) {
    where.createdAt = {} as Prisma.DateTimeFilter;
    if (filter.startDate) {
      (where.createdAt as Prisma.DateTimeFilter).gte = new Date(
        filter.startDate,
      );
    }
    if (filter.endDate) {
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Prisma.DateTimeFilter).lte = end;
    }
  }

  if (filter.search) {
    where.OR = [
      { saleCode: { contains: filter.search, mode: "insensitive" } },
      { member: { phone: { contains: filter.search, mode: "insensitive" } } },
      { member: { name: { contains: filter.search, mode: "insensitive" } } },
    ];
  }

  if (filter.createdById) where.createdById = filter.createdById;

  return where;
}

function buildSaleOrderBy(
  sortBy: string,
  sortOrder: "asc" | "desc",
): Prisma.SaleOrderByWithRelationInput {
  const field = ALLOWED_SORT_FIELDS.includes(
    sortBy as (typeof ALLOWED_SORT_FIELDS)[number],
  )
    ? sortBy
    : "createdAt";
  return { [field]: sortOrder };
}

function buildDateFilter(
  startDate?: string,
  endDate?: string,
): Prisma.DateTimeFilter | undefined {
  const dateFilter: Prisma.DateTimeFilter = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }
  return Object.keys(dateFilter).length > 0 ? dateFilter : undefined;
}

// ─── Location ────────────────────────────────────────────────────────────────

export async function findLocationById(id: string) {
  return prisma.location.findUnique({
    where: { id },
  });
}

export async function findShowroomLocations() {
  return prisma.location.findMany({
    where: { type: "SHOWROOM", isActive: true },
    select: { id: true, name: true },
  });
}

// ─── Member ──────────────────────────────────────────────────────────────────

export async function findMemberByPhone(phone: string) {
  return prisma.member.findFirst({
    where: { phone },
  });
}

export async function createMember(data: {
  tenantId: string;
  phone: string;
  name?: string | null;
}) {
  return prisma.member.create({
    data: {
      tenantId: data.tenantId,
      phone: data.phone,
      name: data.name ?? null,
    },
  });
}

export async function updateMemberAggregation(
  memberId: string,
  data: {
    totalIncrement: number;
    memberSince: Date;
    firstPurchase: Date;
  },
) {
  return prisma.member.update({
    where: { id: memberId },
    data: {
      totalSales: { increment: data.totalIncrement },
      memberSince: data.memberSince,
      firstPurchase: data.firstPurchase,
    },
  });
}

// ─── User ────────────────────────────────────────────────────────────────────

export async function findUserLastLogin(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { lastLoginAt: true },
  });
}

// ─── PromoCode ───────────────────────────────────────────────────────────────

export async function findPromoByCode(tenantId: string, code: string) {
  return prisma.promoCode.findFirst({
    where: { tenantId, code, isActive: true },
  });
}

export async function findPromoByCodeWithProducts(
  tenantId: string,
  code: string,
) {
  return prisma.promoCode.findFirst({
    where: { tenantId, code },
    include: { products: { include: { product: true } } },
  });
}

export async function incrementPromoUsage(promoId: string) {
  return prisma.promoCode.update({
    where: { id: promoId },
    data: { usageCount: { increment: 1 } },
  });
}

// ─── ProductVariation (for sale calculation) ──────────────────────────────────

function activeDiscountsInclude() {
  return {
    subVariations: { select: { id: true, name: true } },
    product: {
      include: {
        discounts: {
          where: {
            isActive: true,
            OR: [{ startDate: null }, { startDate: { lte: new Date() } }],
            AND: [
              { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
            ],
          },
          include: { discountType: true },
        },
      },
    },
  };
}

export async function findVariationWithDiscounts(variationId: string) {
  return prisma.productVariation.findUnique({
    where: { id: variationId },
    include: activeDiscountsInclude(),
  });
}

// ─── LocationInventory ───────────────────────────────────────────────────────

export async function findInventory(
  locationId: string,
  variationId: string,
  subVariationId: string | null,
) {
  if (subVariationId != null) {
    return prisma.locationInventory.findUnique({
      where: {
        locationId_variationId_subVariationId: {
          locationId,
          variationId,
          subVariationId,
        },
      },
    });
  }
  return prisma.locationInventory.findFirst({
    where: {
      locationId,
      variationId,
      subVariationId: null,
    },
  });
}

// ─── Sale CRUD ───────────────────────────────────────────────────────────────

export interface CreateSaleWithItemsInput {
  tenantId: string;
  saleCode: string;
  type: "GENERAL" | "MEMBER";
  isCreditSale: boolean;
  locationId: string;
  memberId: string | null;
  createdById: string;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  items: Array<{
    variationId: string;
    subVariationId: string | null;
    quantity: number;
    unitPrice: number;
    totalMrp: number;
    discountPercent: number;
    discountAmount: number;
    lineTotal: number;
  }>;
  payments?: Array<{
    method: "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR";
    amount: number;
  }>;
}

const SALE_INCLUDE_FULL = {
  location: { select: { id: true, name: true } },
  member: { select: { id: true, phone: true, name: true } },
  createdBy: { select: { id: true, username: true } },
  items: {
    include: {
      variation: {
        include: {
          product: { select: { id: true, name: true } },
          attributes: {
            include: {
              attributeType: { select: { name: true } },
              attributeValue: { select: { value: true } },
            },
          },
        },
      },
      subVariation: { select: { id: true, name: true } },
    },
  },
  payments: true,
} as const;

export async function createSaleWithItemsAndDeductInventory(
  input: CreateSaleWithItemsInput,
) {
  return prisma.$transaction(async (tx) => {
    const newSale = await tx.sale.create({
      data: {
        tenantId: input.tenantId,
        saleCode: input.saleCode,
        type: input.type,
        isCreditSale: input.isCreditSale,
        locationId: input.locationId,
        memberId: input.memberId,
        subtotal: input.subtotal,
        discount: input.discount,
        total: input.total,
        notes: input.notes,
        createdById: input.createdById,
        items: {
          create: input.items.map((item) => ({
            variationId: item.variationId,
            subVariationId: item.subVariationId ?? undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalMrp: item.totalMrp,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            lineTotal: item.lineTotal,
          })),
        },
        payments:
          input.payments && input.payments.length > 0
            ? {
                create: input.payments.map((p) => ({
                  method: p.method,
                  amount: p.amount,
                })),
              }
            : undefined,
      },
      include: SALE_INCLUDE_FULL,
    });

    for (const item of input.items) {
      const inv =
        item.subVariationId != null
          ? await tx.locationInventory.findUnique({
              where: {
                locationId_variationId_subVariationId: {
                  locationId: input.locationId,
                  variationId: item.variationId,
                  subVariationId: item.subVariationId,
                },
              },
            })
          : await tx.locationInventory.findFirst({
              where: {
                locationId: input.locationId,
                variationId: item.variationId,
                subVariationId: null,
              },
            });
      if (!inv) {
        throw new Error(
          `Inventory not found for location ${input.locationId}, variation ${item.variationId}`,
        );
      }
      await tx.locationInventory.update({
        where: { id: inv.id },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    return newSale;
  });
}

const SALE_LIST_INCLUDE = {
  location: { select: { id: true, name: true } },
  member: { select: { id: true, phone: true, name: true } },
  createdBy: { select: { id: true, username: true } },
  payments: {
    select: { method: true, amount: true },
    take: 1,
    orderBy: { createdAt: "asc" as const },
  },
  _count: { select: { items: true } },
} as const;

export async function findSalesPaginated(
  where: Prisma.SaleWhereInput,
  opts: {
    skip: number;
    take: number;
    orderBy: Prisma.SaleOrderByWithRelationInput;
  },
) {
  return prisma.sale.findMany({
    where,
    skip: opts.skip,
    take: opts.take,
    orderBy: opts.orderBy,
    include: SALE_LIST_INCLUDE,
  });
}

export async function countSales(where: Prisma.SaleWhereInput) {
  return prisma.sale.count({ where });
}

/** Filter-based list — service never needs Prisma. */
export async function findSalesPaginatedByFilter(
  filter: SaleListFilterParams,
  pagination: SaleListPaginationParams,
) {
  const where = buildSaleWhereFromFilter(filter);
  const orderBy = buildSaleOrderBy(pagination.sortBy, pagination.sortOrder);
  const skip = (pagination.page - 1) * pagination.limit;
  return findSalesPaginated(where, {
    skip,
    take: pagination.limit,
    orderBy,
  });
}

/** Filter-based count — service never needs Prisma. */
export async function countSalesByFilter(filter: SaleListFilterParams) {
  const where = buildSaleWhereFromFilter(filter);
  return countSales(where);
}

/** Sales for a user since a given date (for "since last login"). */
export async function findSalesPaginatedForUserSince(
  userId: string,
  since: Date,
  pagination: { page: number; limit: number },
) {
  const where: Prisma.SaleWhereInput = {
    createdById: userId,
    createdAt: { gte: since },
  };
  const skip = (pagination.page - 1) * pagination.limit;
  return findSalesPaginated(where, {
    skip,
    take: pagination.limit,
    orderBy: { createdAt: "desc" },
  });
}

export async function countSalesForUserSince(userId: string, since: Date) {
  return countSales({
    createdById: userId,
    createdAt: { gte: since },
  });
}

const SALE_DETAIL_INCLUDE = {
  location: true,
  member: true,
  createdBy: { select: { id: true, username: true, role: true } },
  payments: {
    select: { id: true, method: true, amount: true, createdAt: true },
    orderBy: { createdAt: "asc" as const },
  },
  items: {
    include: {
      variation: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
          attributes: {
            include: {
              attributeType: { select: { name: true } },
              attributeValue: { select: { value: true } },
            },
          },
          photos: { where: { isPrimary: true }, take: 1 },
        },
      },
      subVariation: { select: { id: true, name: true } },
    },
  },
} as const;

export async function findSaleById(id: string) {
  return prisma.sale.findUnique({
    where: { id },
    include: SALE_DETAIL_INCLUDE,
  });
}

export async function findSaleWithPaymentsOnly(id: string) {
  return prisma.sale.findUnique({
    where: { id },
    include: { payments: { select: { amount: true } } },
  });
}

const SALE_EXPORT_INCLUDE = {
  location: true,
  member: true,
  createdBy: { select: { id: true, username: true } },
  payments: true,
  items: {
    include: {
      variation: {
        include: {
          product: {
            include: { category: true },
          },
          attributes: {
            include: {
              attributeType: { select: { name: true } },
              attributeValue: { select: { value: true } },
            },
          },
        },
      },
      subVariation: { select: { id: true, name: true } },
    },
  },
} as const;

export async function findSalesForExport(where: Prisma.SaleWhereInput) {
  return prisma.sale.findMany({
    where,
    include: SALE_EXPORT_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export async function findSalesForDailyChart(
  where: Prisma.SaleWhereInput,
  select: { total: true; type: true; createdAt: true },
) {
  return prisma.sale.findMany({
    where,
    select,
    orderBy: { createdAt: "asc" },
  });
}

// ─── SalePayment ─────────────────────────────────────────────────────────────

export async function createSalePayment(data: {
  saleId: string;
  method: "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR";
  amount: number;
}) {
  return prisma.salePayment.create({
    data,
  });
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function aggregateSales(where: Prisma.SaleWhereInput) {
  return prisma.sale.aggregate({
    where,
    _sum: { total: true, discount: true },
    _count: true,
  });
}

export async function aggregateSalesByType(
  where: Prisma.SaleWhereInput,
  type: "GENERAL" | "MEMBER",
) {
  return prisma.sale.aggregate({
    where: { ...where, type },
    _sum: { total: true },
    _count: true,
  });
}

/** Filter-based aggregates for sales summary. */
export async function aggregateSalesByFilter(filter: SaleDateFilterParams) {
  const dateFilter = buildDateFilter(filter.startDate, filter.endDate);
  const where: Prisma.SaleWhereInput = {};
  if (filter.locationId) where.locationId = filter.locationId;
  if (dateFilter) where.createdAt = dateFilter;
  return aggregateSales(where);
}

export async function aggregateSalesByTypeByFilter(
  filter: SaleDateFilterParams,
  type: "GENERAL" | "MEMBER",
) {
  const dateFilter = buildDateFilter(filter.startDate, filter.endDate);
  const where: Prisma.SaleWhereInput = {};
  if (filter.locationId) where.locationId = filter.locationId;
  if (dateFilter) where.createdAt = dateFilter;
  return aggregateSalesByType(where, type);
}

/** Filter-based export — accepts ids array. */
export async function findSalesForExportByFilter(
  filter: SaleExportFilterParams,
) {
  const where: Prisma.SaleWhereInput = {};
  if (filter.ids && filter.ids.length > 0) {
    where.id = { in: filter.ids };
  }
  return findSalesForExport(where);
}

/** Filter-based daily chart — accepts locationId and date range. */
export async function findSalesForDailyChartByFilter(filter: {
  locationId?: string;
  startDate: Date;
  endDate: Date;
}) {
  const where: Prisma.SaleWhereInput = {
    createdAt: { gte: filter.startDate, lte: filter.endDate },
  };
  if (filter.locationId) where.locationId = filter.locationId;
  return findSalesForDailyChart(where, {
    total: true,
    type: true,
    createdAt: true,
  });
}

// ─── AuditLog ────────────────────────────────────────────────────────────────

export async function createAuditLog(data: {
  tenantId: string | null;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  return prisma.auditLog.create({
    data: {
      tenantId: data.tenantId,
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      details: data.details as Prisma.InputJsonValue,
      ip: data.ip,
      userAgent: data.userAgent,
    },
  });
}

// ─── Bulk operations ─────────────────────────────────────────────────────────

export async function findLocationsShowrooms(tenantId: string) {
  return prisma.location.findMany({
    where: { tenantId, type: "SHOWROOM", isActive: true },
    select: { id: true, name: true },
  });
}

export async function findAllUsersForBulk() {
  return prisma.user.findMany({
    select: { id: true, username: true },
  });
}

export async function findProductsByTenant(tenantId: string) {
  return prisma.product.findMany({
    where: { tenantId },
    select: { id: true, name: true },
  });
}

export async function findVariationsByTenant(tenantId: string) {
  return prisma.productVariation.findMany({
    where: { tenantId },
    select: {
      id: true,
      imsCode: true,
      productId: true,
      product: { select: { id: true, name: true } },
    },
  });
}

export async function findSaleByIdMinimal(id: string) {
  return prisma.sale.findUnique({
    where: { id },
  });
}

export async function createSaleBulk(data: {
  tenantId: string;
  id?: string;
  saleCode: string;
  type: "GENERAL" | "MEMBER";
  locationId: string;
  memberId?: string | null;
  createdById: string;
  subtotal: number;
  discount: number;
  total: number;
  createdAt: Date;
  items: Array<{
    variationId: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    lineTotal: number;
  }>;
  paymentMethod: "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR";
}) {
  return prisma.sale.create({
    data: {
      tenantId: data.tenantId,
      ...(data.id && { id: data.id }),
      saleCode: data.saleCode,
      type: data.type,
      locationId: data.locationId,
      ...(data.memberId && { memberId: data.memberId }),
      createdById: data.createdById,
      subtotal: data.subtotal,
      discount: data.discount,
      total: data.total,
      createdAt: data.createdAt,
      items: {
        create: data.items.map((item) => ({
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
        create: [{ method: data.paymentMethod, amount: data.total }],
      },
    },
    include: { items: true },
  });
}
