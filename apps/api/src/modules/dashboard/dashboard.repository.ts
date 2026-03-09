import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const OVERDUE_CREDIT_DAYS = 30;
const LOW_STOCK_THRESHOLD = 5;
const RECENT_SALES_LIMIT = 10;
const PERSONAL_TREND_DAYS = 7;
const AUDIT_INSIGHTS_LIMIT = 10;

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(23, 59, 59, 999);
  return out;
}

function daysAgo(days: number): Date {
  const out = new Date();
  out.setDate(out.getDate() - days);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function locationInventoryTenantWhere(
  tenantId: string | null,
  existingWhere: Record<string, unknown> = {},
): Prisma.LocationInventoryWhereInput {
  if (!tenantId) return existingWhere as Prisma.LocationInventoryWhereInput;
  return {
    ...(existingWhere as Prisma.LocationInventoryWhereInput),
    location: {
      ...((existingWhere.location as object) ?? {}),
      tenantId,
    },
  } as Prisma.LocationInventoryWhereInput;
}

export class DashboardRepository {
  async getUserSummaryData(userId: string) {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastLoginAt: true },
    });
    const since = user?.lastLoginAt ?? new Date(0);

    const baseWhere = { createdById: userId };
    const todayWhere = {
      ...baseWhere,
      createdAt: { gte: todayStart, lte: todayEnd },
    };

    const [
      todayStats,
      creditSalesWithPayments,
      sinceLoginStats,
      salesForTrend,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: todayWhere,
        _count: true,
        _sum: { total: true },
      }),
      prisma.sale.findMany({
        where: { ...baseWhere, isCreditSale: true },
        select: {
          id: true,
          saleCode: true,
          total: true,
          createdAt: true,
          payments: { select: { amount: true } },
        },
      }),
      prisma.sale.aggregate({
        where: { ...baseWhere, createdAt: { gte: since } },
        _count: true,
        _sum: { total: true },
      }),
      prisma.sale.findMany({
        where: baseWhere,
        select: { createdAt: true, total: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    const recentSalesList = await prisma.sale.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      take: RECENT_SALES_LIMIT,
      select: {
        id: true,
        saleCode: true,
        total: true,
        createdAt: true,
        location: { select: { name: true } },
      },
    });

    const trendStart = daysAgo(PERSONAL_TREND_DAYS);

    return {
      todayStats,
      creditSalesWithPayments,
      sinceLoginStats,
      salesForTrend,
      recentSalesList,
      today,
      trendStart,
      PERSONAL_TREND_DAYS,
      RECENT_SALES_LIMIT,
    };
  }

  async getAdminSummaryData(tenantId: string | null) {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const overdueCutoff = daysAgo(OVERDUE_CREDIT_DAYS);

    const invWhere = locationInventoryTenantWhere(tenantId);

    const [
      todayRevenueAgg,
      allCreditSales,
      inventoryRows,
      lowStockRows,
      transferCounts,
      locationRevenue,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: { createdAt: { gte: todayStart, lte: todayEnd } },
        _sum: { total: true },
      }),
      prisma.sale.findMany({
        where: { isCreditSale: true },
        select: {
          total: true,
          createdAt: true,
          payments: { select: { amount: true } },
        },
      }),
      prisma.locationInventory.findMany({
        where: invWhere,
        select: {
          quantity: true,
          variation: {
            select: {
              product: { select: { costPrice: true, mrp: true } },
            },
          },
        },
      }),
      prisma.locationInventory.groupBy({
        by: ["variationId"],
        where: invWhere,
        _sum: { quantity: true },
      }),
      prisma.transfer.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.sale.groupBy({
        by: ["locationId"],
        where: { createdAt: { gte: todayStart, lte: todayEnd } },
        _sum: { total: true },
      }),
    ]);

    const lowStockCount = lowStockRows.filter(
      (r) => Number(r._sum?.quantity ?? 0) < LOW_STOCK_THRESHOLD,
    ).length;

    const locationIds = [...new Set(locationRevenue.map((r) => r.locationId))];
    const locations =
      locationIds.length > 0
        ? await prisma.location.findMany({
            where: { id: { in: locationIds } },
            select: { id: true, name: true },
          })
        : [];

    return {
      todayRevenueAgg,
      allCreditSales,
      inventoryRows,
      lowStockCount,
      transferCounts,
      locationRevenue,
      locations,
      overdueCutoff,
    };
  }

  async getSuperAdminSummaryData() {
    const todayStart = startOfDay(new Date());
    const weekAgo = daysAgo(7);
    const twoWeeksAgo = daysAgo(14);

    const [
      activeUsersToday,
      errorReportCounts,
      auditLogs,
      creditSalesThisWeek,
      creditSalesLastWeek,
      discountAgg,
      negativeStockCount,
    ] = await Promise.all([
      prisma.user.count({
        where: { lastLoginAt: { gte: todayStart } },
      }),
      prisma.errorReport.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: AUDIT_INSIGHTS_LIMIT,
        include: {
          user: { select: { username: true } },
        },
      }),
      prisma.sale.findMany({
        where: {
          isCreditSale: true,
          createdAt: { gte: weekAgo },
        },
        select: { total: true, payments: { select: { amount: true } } },
      }),
      prisma.sale.findMany({
        where: {
          isCreditSale: true,
          createdAt: { gte: twoWeeksAgo, lt: weekAgo },
        },
        select: { total: true, payments: { select: { amount: true } } },
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: weekAgo } },
        _sum: { discount: true },
      }),
      prisma.locationInventory.count({
        where: { quantity: { lt: 0 } },
      }),
    ]);

    return {
      activeUsersToday,
      errorReportCounts,
      auditLogs,
      creditSalesThisWeek,
      creditSalesLastWeek,
      discountAgg,
      negativeStockCount,
    };
  }
}

export default new DashboardRepository();
