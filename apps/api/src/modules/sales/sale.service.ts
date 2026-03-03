/**
 * Sale Service — Business logic for sale creation, preview, and calculation.
 * No Prisma, no req/res. Uses repository for data access.
 */

import {
  findVariationWithDiscounts,
  findInventory,
  findPromoByCodeWithProducts,
  findLocationById,
  findMemberByPhone,
  createMember,
  findPromoByCode,
  incrementPromoUsage,
  createSaleWithItemsAndDeductInventory,
  updateMemberAggregation,
  createAuditLog,
  findUserLastLogin,
  findSaleById,
  findSaleWithPaymentsOnly,
  createSalePayment,
  findShowroomLocations,
  findSalesPaginatedByFilter,
  countSalesByFilter,
  findSalesPaginatedForUserSince,
  countSalesForUserSince,
  aggregateSalesByFilter,
  aggregateSalesByTypeByFilter,
  findSalesForExportByFilter,
  findSalesForDailyChartByFilter,
} from "./sale.repository";

// ── Shared types ──────────────────────────────────────────────────────────

export interface SaleItemInput {
  variationId: string;
  subVariationId?: string | null;
  quantity: number;
  discountId?: string | null;
  promoCode?: string;
}

export interface ProcessedItem {
  variationId: string;
  subVariationId: string | null;
  quantity: number;
  unitPrice: number;
  totalMrp: number;
  discountPercent: number;
  discountAmount: number;
  lineTotal: number;
  promoDiscount: number;
}

export interface CalculationResult {
  processedItems: ProcessedItem[];
  subtotal: number;
  totalDiscount: number;
  totalPromoDiscount: number;
  total: number;
}

export class SaleCalculationError extends Error {
  status: number;
  extra?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    extra?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// ── Core calculation ──────────────────────────────────────────────────────

/**
 * Validates items, resolves discounts & promo codes, and computes totals.
 *
 * Pure calculation — no DB writes (stock decrement, promo usage, sale
 * creation) happen here. The caller decides what to persist.
 *
 * Throws `SaleCalculationError` on validation failures (bad item, missing
 * stock, unknown variation, etc.).
 */
export async function calculateSaleItems(
  items: SaleItemInput[],
  locationId: string,
  saleType: "GENERAL" | "MEMBER",
  tenantId: string,
): Promise<CalculationResult> {
  const processedItems: ProcessedItem[] = [];
  let subtotal = 0;
  let totalDiscount = 0;
  let totalPromoDiscount = 0;

  for (const item of items) {
    if (!item.variationId || !item.quantity || item.quantity <= 0) {
      throw new SaleCalculationError(
        400,
        "Each item must have a variationId and positive quantity",
      );
    }

    const variation = await findVariationWithDiscounts(item.variationId);

    if (!variation) {
      throw new SaleCalculationError(
        404,
        `Product variation ${item.variationId} not found`,
      );
    }

    // ── Sub-variation validation ──────────────────────────────────────

    const hasSubVariants = (variation.subVariations?.length ?? 0) > 0;
    const subVariationId = item.subVariationId ?? null;

    if (hasSubVariants && !subVariationId) {
      throw new SaleCalculationError(
        400,
        `Variation ${variation.imsCode} has sub-variants; please specify subVariationId`,
      );
    }
    if (!hasSubVariants && subVariationId) {
      throw new SaleCalculationError(
        400,
        `Variation ${variation.imsCode} has no sub-variants; do not send subVariationId`,
      );
    }
    if (subVariationId) {
      const belongs = variation.subVariations?.some(
        (s) => s.id === subVariationId,
      );
      if (!belongs) {
        throw new SaleCalculationError(
          400,
          `Sub-variation ${subVariationId} does not belong to variation ${item.variationId}`,
        );
      }
    }

    // ── Stock check ──────────────────────────────────────────────────

    const inventory = await findInventory(
      locationId,
      item.variationId,
      subVariationId,
    );

    const availableStock = inventory?.quantity || 0;
    if (availableStock < item.quantity) {
      throw new SaleCalculationError(
        400,
        `Insufficient stock for ${variation.product.name} (${variation.imsCode}${subVariationId ? " / sub-variant" : ""})`,
        { available: availableStock, requested: item.quantity },
      );
    }

    // ── Price & discount resolution ──────────────────────────────────

    const unitPrice = Number(variation.product.mrp);
    const itemSubtotal = unitPrice * item.quantity;
    let discountPercent = 0;
    let discountAmount = 0;

    type DiscountRow = (typeof variation.product.discounts)[number] & {
      discountType: { name: string };
    };
    const activeDiscounts = variation.product.discounts as DiscountRow[];
    let baseDiscount: DiscountRow | null = null;

    if (item.discountId && item.discountId !== "none") {
      baseDiscount =
        activeDiscounts?.find((d) => d.id === item.discountId) ?? null;
    } else if (!item.discountId) {
      if (activeDiscounts && activeDiscounts.length > 0) {
        const eligible = activeDiscounts.filter((d) => {
          const tn = d.discountType.name.toLowerCase();
          if (saleType === "MEMBER") {
            return tn.includes("member") || tn.includes("non-member");
          }
          return tn.includes("non-member") || tn.includes("wholesale");
        });
        if (eligible.length > 0) {
          eligible.sort((a, b) => {
            const aS = a.discountType.name.toLowerCase() === "special" ? 1 : 0;
            const bS = b.discountType.name.toLowerCase() === "special" ? 1 : 0;
            if (aS !== bS) return bS - aS;
            const aV =
              a.valueType === "FLAT"
                ? Number(a.value)
                : (Number(a.value) / 100) * itemSubtotal;
            const bV =
              b.valueType === "FLAT"
                ? Number(b.value)
                : (Number(b.value) / 100) * itemSubtotal;
            return bV - aV;
          });
          baseDiscount = eligible[0];
        }
      }
    }

    if (baseDiscount) {
      const val =
        Number(baseDiscount.value) || Number(baseDiscount.discountPercentage);
      if (baseDiscount.valueType === "FLAT") {
        discountAmount += val;
      } else {
        discountPercent += val;
      }
    }

    // ── Promo code ───────────────────────────────────────────────────

    let itemPromoDiscount = 0;

    if (item.promoCode) {
      const promo = await findPromoByCodeWithProducts(tenantId, item.promoCode);

      if (promo && promo.isActive) {
        const now = new Date();
        const withinDates =
          (!promo.validFrom || promo.validFrom <= now) &&
          (!promo.validTo || promo.validTo >= now) &&
          (!promo.usageLimit || promo.usageCount < promo.usageLimit);

        if (withinDates) {
          const isProductEligible =
            promo.products.length === 0 ||
            promo.products.some((pp) => pp.productId === variation.productId);

          let isCustomerEligible = false;
          if (promo.eligibility === "ALL") isCustomerEligible = true;
          else if (promo.eligibility === "MEMBER")
            isCustomerEligible = saleType === "MEMBER";
          else if (promo.eligibility === "NON_MEMBER")
            isCustomerEligible = saleType === "GENERAL";

          if (isProductEligible && isCustomerEligible) {
            const baseAfterProductDiscount =
              itemSubtotal -
              (discountAmount + itemSubtotal * (discountPercent / 100));

            let promoAmt = 0;
            if (promo.valueType === "FLAT") {
              promoAmt = Number(promo.value);
            } else {
              promoAmt = baseAfterProductDiscount * (Number(promo.value) / 100);
            }

            if (promo.overrideDiscounts) {
              discountAmount = promoAmt;
              discountPercent = 0;
            } else if (promo.allowStacking) {
              discountAmount += promoAmt;
            } else {
              const baseTotalDiscount =
                discountAmount + itemSubtotal * (discountPercent / 100);
              if (promoAmt > baseTotalDiscount) {
                discountAmount = promoAmt;
                discountPercent = 0;
              }
            }

            itemPromoDiscount = Math.min(promoAmt, itemSubtotal);
          }
        }
      }
    }

    // ── Clamp & accumulate ───────────────────────────────────────────

    const effectiveDiscount =
      Math.min(
        itemSubtotal,
        discountAmount + itemSubtotal * (discountPercent / 100),
      ) || 0;
    const lineTotal = itemSubtotal - effectiveDiscount;

    subtotal += itemSubtotal;
    totalDiscount += effectiveDiscount;
    totalPromoDiscount += itemPromoDiscount;

    processedItems.push({
      variationId: item.variationId,
      subVariationId: subVariationId ?? null,
      quantity: item.quantity,
      unitPrice,
      totalMrp: itemSubtotal,
      discountPercent,
      discountAmount: effectiveDiscount,
      lineTotal,
      promoDiscount: itemPromoDiscount,
    });
  }

  const total = Math.round((subtotal - totalDiscount) * 100) / 100;

  return {
    processedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalPromoDiscount: Math.round(totalPromoDiscount * 100) / 100,
    total,
  };
}

// ── SaleService class (orchestration for controller) ───────────────────────

function generateSaleCode(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SL-${dateStr}-${random}`;
}

export interface CreateSaleContext {
  tenantId: string;
  userId: string;
  ip?: string;
  userAgent?: string;
}

export interface GetAllSalesParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  search?: string;
  locationId?: string;
  createdById?: string;
  type?: "GENERAL" | "MEMBER";
  isCreditSale?: boolean;
  startDate?: string;
  endDate?: string;
  userRole?: string;
  userId?: string;
}

export async function createSale(
  ctx: CreateSaleContext,
  dto: {
    locationId: string;
    memberPhone?: string;
    memberName?: string;
    isCreditSale?: boolean;
    items: SaleItemInput[];
    notes?: string;
    payments?: Array<{
      method: "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR";
      amount: number;
    }>;
  },
) {
  const location = await findLocationById(dto.locationId);
  if (!location) {
    throw Object.assign(new Error("Location not found"), { statusCode: 404 });
  }
  if (!location.isActive) {
    throw Object.assign(new Error("Location is inactive"), { statusCode: 400 });
  }
  if (location.type !== "SHOWROOM") {
    throw Object.assign(
      new Error("Sales can only be made at showrooms, not warehouses"),
      { statusCode: 400 },
    );
  }

  let member: Awaited<ReturnType<typeof findMemberByPhone>> = null;
  let saleType: "GENERAL" | "MEMBER" = "GENERAL";

  if (dto.memberPhone) {
    const { parseAndValidatePhone } = await import("@/utils/phone");
    const parsed = parseAndValidatePhone(dto.memberPhone);
    if (!parsed.valid) {
      const err = parsed as { valid: false; message: string };
      throw Object.assign(new Error(err.message), { statusCode: 400 });
    }
    member = await findMemberByPhone(parsed.e164);
    if (!member) {
      member = await createMember({
        tenantId: ctx.tenantId,
        phone: parsed.e164,
        name: dto.memberName?.trim() || null,
      });
    }
    if (member.isActive) saleType = "MEMBER";
  }

  if (dto.isCreditSale === true && !member) {
    throw Object.assign(
      new Error(
        "Credit sales require a customer (member). Please enter the customer's phone number.",
      ),
      { statusCode: 400 },
    );
  }

  const { processedItems, subtotal, totalDiscount, total } =
    await calculateSaleItems(dto.items, dto.locationId, saleType, ctx.tenantId);

  const promoCodesUsed = new Set<string>();
  for (const item of dto.items) {
    if (item.promoCode && !promoCodesUsed.has(item.promoCode)) {
      const promo = await findPromoByCode(ctx.tenantId, item.promoCode);
      if (promo) {
        await incrementPromoUsage(promo.id);
        promoCodesUsed.add(item.promoCode);
      }
    }
  }

  const creditSale = dto.isCreditSale === true;

  if (!creditSale && dto.payments && dto.payments.length > 0) {
    const paymentSum =
      Math.round(
        dto.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0) * 100,
      ) / 100;
    if (Math.abs(paymentSum - total) > 0.01) {
      throw Object.assign(
        new Error(
          "Sum of payment sources must match final total (after discounts)",
        ),
        { statusCode: 400, extra: { total, paymentSum } },
      );
    }
  }

  const sale = await createSaleWithItemsAndDeductInventory({
    tenantId: ctx.tenantId,
    saleCode: generateSaleCode(),
    type: saleType,
    isCreditSale: creditSale,
    locationId: dto.locationId,
    memberId: member?.id ?? null,
    createdById: ctx.userId,
    subtotal,
    discount: totalDiscount,
    total,
    notes: dto.notes ?? null,
    items: processedItems.map((item) => ({
      variationId: item.variationId,
      subVariationId: item.subVariationId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalMrp: item.totalMrp,
      discountPercent: item.discountPercent,
      discountAmount: item.discountAmount,
      lineTotal: item.lineTotal,
    })),
    payments: dto.payments,
  });

  if (member) {
    try {
      await updateMemberAggregation(member.id, {
        totalIncrement: total,
        memberSince: member.createdAt ?? new Date(),
        firstPurchase: member.firstPurchase ?? new Date(),
      });
    } catch {
      // Log but don't fail sale creation
    }
  }

  try {
    await createAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "CREATE_SALE",
      resource: "sale",
      resourceId: sale.id,
      details: {
        saleCode: sale.saleCode,
        total: Number(sale.total),
        locationId: sale.locationId,
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  } catch {
    // Log but don't fail
  }

  return sale;
}

export async function previewSale(
  ctx: { tenantId: string },
  dto: {
    locationId: string;
    memberPhone?: string;
    items: SaleItemInput[];
  },
) {
  const location = await findLocationById(dto.locationId);
  if (!location || !location.isActive || location.type !== "SHOWROOM") {
    throw Object.assign(new Error("Invalid or inactive showroom"), {
      statusCode: 400,
    });
  }

  let saleType: "GENERAL" | "MEMBER" = "GENERAL";
  if (dto.memberPhone) {
    const { parseAndValidatePhone } = await import("@/utils/phone");
    const parsed = parseAndValidatePhone(dto.memberPhone);
    if (!parsed.valid) {
      const err = parsed as { valid: false; message: string };
      throw Object.assign(new Error(err.message), { statusCode: 400 });
    }
    const member = await findMemberByPhone(parsed.e164);
    if (member?.isActive) saleType = "MEMBER";
  }

  return calculateSaleItems(dto.items, dto.locationId, saleType, ctx.tenantId);
}

export async function getAllSales(params: GetAllSalesParams) {
  let startDate = params.startDate;
  let endDate = params.endDate;

  // Business rule: "user" role restricted to today and yesterday
  if (params.userRole === "user") {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const yesterdayStart = new Date(today);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    if (!startDate && !endDate) {
      startDate = todayStart.toISOString().slice(0, 10);
      endDate = today.toISOString().slice(0, 10);
    } else {
      const reqStart = startDate ? new Date(startDate) : yesterdayStart;
      const reqEnd = endDate ? new Date(endDate) : today;
      if (reqStart < yesterdayStart)
        startDate = yesterdayStart.toISOString().slice(0, 10);
      if (reqEnd > today) endDate = today.toISOString().slice(0, 10);
    }
  }

  const filter = {
    locationId: params.locationId,
    createdById:
      params.userRole === "user" && params.userId
        ? params.userId
        : params.createdById,
    type: params.type,
    isCreditSale: params.isCreditSale,
    startDate,
    endDate,
    search: params.search,
  };

  const pagination = {
    page: params.page,
    limit: params.limit,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };

  const [totalItems, sales] = await Promise.all([
    countSalesByFilter(filter),
    findSalesPaginatedByFilter(filter, pagination),
  ]);

  return { sales, totalItems, page: params.page, limit: params.limit };
}

export async function getSalesSinceLastLogin(
  userId: string,
  params: { page: number; limit: number },
) {
  const user = await findUserLastLogin(userId);
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }
  const since = user.lastLoginAt ?? new Date(0);

  const [totalItems, sales] = await Promise.all([
    countSalesForUserSince(userId, since),
    findSalesPaginatedForUserSince(userId, since, params),
  ]);

  return { sales, totalItems, page: params.page, limit: params.limit };
}

export async function getSaleById(id: string) {
  const sale = await findSaleById(id);
  if (!sale) {
    throw Object.assign(new Error("Sale not found"), { statusCode: 404 });
  }
  return sale;
}

export async function addPayment(
  saleId: string,
  dto: { method: string; amount: number },
) {
  const sale = await findSaleWithPaymentsOnly(saleId);
  if (!sale) {
    throw Object.assign(new Error("Sale not found"), { statusCode: 404 });
  }
  if (!sale.isCreditSale) {
    throw Object.assign(
      new Error("Payments can only be added to credit sales"),
      { statusCode: 400 },
    );
  }

  const amountPaid =
    sale.payments.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalNum = Number(sale.total);
  const balanceDue = Math.round((totalNum - amountPaid) * 100) / 100;

  if (dto.amount > balanceDue + 0.01) {
    throw Object.assign(new Error("Payment amount exceeds balance due"), {
      statusCode: 400,
      extra: { balanceDue },
    });
  }

  const payment = await createSalePayment({
    saleId,
    method: dto.method as "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR",
    amount: dto.amount,
  });

  const updatedSale = await findSaleById(saleId);
  return { sale: updatedSale!, payment };
}

export async function getSalesSummary(params: {
  locationId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const filter = {
    locationId: params.locationId,
    startDate: params.startDate,
    endDate: params.endDate,
  };

  const [totalStats, generalStats, memberStats] = await Promise.all([
    aggregateSalesByFilter(filter),
    aggregateSalesByTypeByFilter(filter, "GENERAL"),
    aggregateSalesByTypeByFilter(filter, "MEMBER"),
  ]);

  return {
    totalSales: totalStats._count,
    totalRevenue: Number(totalStats._sum.total) || 0,
    totalDiscount: Number(totalStats._sum.discount) || 0,
    generalSales: {
      count: generalStats._count,
      revenue: Number(generalStats._sum.total) || 0,
    },
    memberSales: {
      count: memberStats._count,
      revenue: Number(memberStats._sum.total) || 0,
    },
  };
}

export async function getSalesByLocation(params: {
  startDate?: string;
  endDate?: string;
}) {
  const filter = {
    startDate: params.startDate,
    endDate: params.endDate,
  };

  const locations = await findShowroomLocations();

  const locationStats = await Promise.all(
    locations.map(async (location) => {
      const stats = await aggregateSalesByFilter({
        ...filter,
        locationId: location.id,
      });
      return {
        locationId: location.id,
        locationName: location.name,
        totalSales: stats._count,
        totalRevenue: Number(stats._sum.total) || 0,
      };
    }),
  );

  return locationStats;
}

export async function getDailySales(params: {
  locationId?: string;
  days?: number;
}) {
  const days = params.days ?? 30;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sales = await findSalesForDailyChartByFilter({
    locationId: params.locationId,
    startDate,
    endDate,
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

export async function getSalesForExport(params: { ids?: string[] }) {
  const sales = await findSalesForExportByFilter({ ids: params.ids });
  if (sales.length === 0) {
    throw Object.assign(new Error("No sales found to export"), {
      statusCode: 404,
    });
  }
  return sales;
}

/** SaleService — business logic, uses repository. Export instance for controller injection. */
export class SaleService {
  async createSale(
    ctx: CreateSaleContext,
    dto: {
      locationId: string;
      memberPhone?: string;
      memberName?: string;
      isCreditSale?: boolean;
      items: SaleItemInput[];
      notes?: string;
      payments?: Array<{
        method: "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR";
        amount: number;
      }>;
    },
  ) {
    return createSale(ctx, dto);
  }

  async previewSale(
    ctx: { tenantId: string },
    dto: {
      locationId: string;
      memberPhone?: string;
      items: SaleItemInput[];
    },
  ) {
    return previewSale(ctx, dto);
  }

  async getAllSales(params: GetAllSalesParams) {
    return getAllSales(params);
  }

  async getSalesSinceLastLogin(
    userId: string,
    params: { page: number; limit: number },
  ) {
    return getSalesSinceLastLogin(userId, params);
  }

  async getSaleById(id: string) {
    return getSaleById(id);
  }

  async addPayment(saleId: string, dto: { method: string; amount: number }) {
    return addPayment(saleId, dto);
  }

  async getSalesSummary(params: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return getSalesSummary(params);
  }

  async getSalesByLocation(params: { startDate?: string; endDate?: string }) {
    return getSalesByLocation(params);
  }

  async getDailySales(params: { locationId?: string; days?: number }) {
    return getDailySales(params);
  }

  async getSalesForExport(params: { ids?: string[] }) {
    return getSalesForExport(params);
  }
}

const saleService = new SaleService();
export default saleService;
