/**
 * Dashboard service: user, admin, and superadmin summary logic.
 * Uses repository for all data access; no Prisma in this file.
 */

import * as repo from "./dashboard.repository";
import type {
  DashboardUserSummary,
  DashboardAdminSummary,
  DashboardSuperAdminSummary,
} from "./dashboard.types";

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

export async function getUserSummary(
  tenantId: string,
  userId: string,
): Promise<DashboardUserSummary> {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  const user = await repo.findUserLastLogin(userId);
  const since = user?.lastLoginAt ?? new Date(0);

  const baseWhere = { tenantId, createdById: userId };
  const todayWhere = {
    ...baseWhere,
    createdAt: { gte: todayStart, lte: todayEnd },
  };

  const [todayStats, creditSalesWithPayments, sinceLoginStats, salesForTrend] =
    await Promise.all([
      repo.aggregateSales(todayWhere),
      repo.findCreditSalesWithPayments({
        ...baseWhere,
        isCreditSale: true,
      }),
      repo.aggregateSales({
        ...baseWhere,
        createdAt: { gte: since },
      }),
      repo.findSales(baseWhere, {
        select: { createdAt: true, total: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

  const creditOutstanding = creditSalesWithPayments.reduce(
    (sum, s) =>
      sum +
      Math.max(
        0,
        Number(s.total) - s.payments.reduce((a, p) => a + Number(p.amount), 0),
      ),
    0,
  );

  const pendingCreditSales = creditSalesWithPayments
    .map((s) => {
      const paid = s.payments.reduce((a, p) => a + Number(p.amount), 0);
      const balance = Math.max(0, Number(s.total) - paid);
      return { sale: s, paid, balance };
    })
    .filter((x) => x.balance > 0)
    .sort(
      (a, b) =>
        new Date(b.sale.createdAt).getTime() -
        new Date(a.sale.createdAt).getTime(),
    )
    .slice(0, 20)
    .map((x) => ({
      id: x.sale.id,
      saleCode: x.sale.saleCode,
      total: Number(x.sale.total),
      paidTotal: x.paid,
      balance: x.balance,
      createdAt: x.sale.createdAt.toISOString(),
    }));

  const recentSalesList = await repo.findSales(baseWhere, {
    select: {
      id: true,
      saleCode: true,
      total: true,
      createdAt: true,
      location: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: RECENT_SALES_LIMIT,
  });

  const trendByDay: Record<string, { revenue: number; count: number }> = {};
  for (let i = 0; i < PERSONAL_TREND_DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (PERSONAL_TREND_DAYS - 1 - i));
    const key = d.toISOString().slice(0, 10);
    trendByDay[key] = { revenue: 0, count: 0 };
  }
  const trendStart = daysAgo(PERSONAL_TREND_DAYS);
  salesForTrend.forEach((s) => {
    const d = new Date(s.createdAt);
    if (d < trendStart) return;
    const key = d.toISOString().slice(0, 10);
    if (trendByDay[key] != null) {
      trendByDay[key].revenue += Number(s.total);
      trendByDay[key].count += 1;
    }
  });
  const personalTrend = Object.entries(trendByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, revenue: v.revenue, count: v.count }));

  return {
    mySalesToday: todayStats._count ?? 0,
    myRevenueToday: Number(todayStats._sum?.total) ?? 0,
    myCreditOutstanding: creditOutstanding,
    sinceLastLogin: {
      salesCount: sinceLoginStats._count ?? 0,
      revenue: Number(sinceLoginStats._sum?.total) ?? 0,
    },
    pendingCreditCount: pendingCreditSales.length,
    pendingCreditSales,
    recentSales: recentSalesList.map((s) => ({
      id: s.id,
      saleCode: s.saleCode,
      total: Number(s.total),
      createdAt: s.createdAt.toISOString(),
      locationName: s.location.name,
    })),
    personalTrend,
  };
}

export async function getAdminSummary(
  tenantId: string,
): Promise<DashboardAdminSummary> {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const overdueCutoff = daysAgo(OVERDUE_CREDIT_DAYS);

  const [
    todayRevenueAgg,
    allCreditSales,
    inventoryRows,
    variationTotals,
    transferCounts,
    locationRevenue,
  ] = await Promise.all([
    repo.aggregateSales({
      tenantId,
      createdAt: { gte: todayStart, lte: todayEnd },
    }),
    repo.findCreditSalesWithPayments({
      tenantId,
      isCreditSale: true,
    }),
    repo.findLocationInventoryForValue(tenantId),
    repo.groupByLocationInventoryByVariation({
      location: { tenantId },
    }),
    repo.groupByTransfers({ tenantId }),
    repo.groupBySalesByLocation({
      tenantId,
      createdAt: { gte: todayStart, lte: todayEnd },
    }),
  ]);

  const creditOutstanding = allCreditSales.reduce(
    (sum, s) =>
      sum +
      Math.max(
        0,
        Number(s.total) - s.payments.reduce((a, p) => a + Number(p.amount), 0),
      ),
    0,
  );
  const overdueCreditCount = allCreditSales.filter((s) => {
    const balance =
      Number(s.total) - s.payments.reduce((a, p) => a + Number(p.amount), 0);
    return balance > 0 && s.createdAt < overdueCutoff;
  }).length;

  const lowStockCount = variationTotals.filter(
    (r) => Number(r._sum?.quantity ?? 0) < LOW_STOCK_THRESHOLD,
  ).length;

  const transferStatusMap = Object.fromEntries(
    transferCounts.map((t) => [t.status, t._count]),
  );

  const inventoryValue = inventoryRows.reduce(
    (sum, row) =>
      sum +
      row.quantity *
        Number(
          row.variation?.product?.costPrice ?? row.variation?.product?.mrp ?? 0,
        ),
    0,
  );

  const locationIds = [...new Set(locationRevenue.map((r) => r.locationId))];
  const locations = await repo.findLocationsByIds(locationIds);
  const locationNameMap = Object.fromEntries(
    locations.map((l) => [l.id, l.name]),
  );
  const locationSnapshot = locationRevenue.map((r) => ({
    locationId: r.locationId,
    locationName: locationNameMap[r.locationId] ?? r.locationId,
    revenue: Number(r._sum?.total) ?? 0,
  }));

  return {
    todayRevenue: Number(todayRevenueAgg._sum?.total) ?? 0,
    netRevenue: Number(todayRevenueAgg._sum?.total) ?? 0,
    creditOutstanding,
    inventoryValue,
    alerts: {
      lowStockCount,
      overdueCreditCount,
      failedTransferCount: transferStatusMap.CANCELLED ?? 0,
    },
    locationSnapshot,
    transferStatusCounts: {
      pending: transferStatusMap.PENDING ?? 0,
      inTransit: transferStatusMap.IN_TRANSIT ?? 0,
      completed: transferStatusMap.COMPLETED ?? 0,
      cancelled: transferStatusMap.CANCELLED ?? 0,
    },
    lowStockCount,
  };
}

export async function getSuperAdminSummary(): Promise<DashboardSuperAdminSummary> {
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
    repo.countUsers({ lastLoginAt: { gte: todayStart } }),
    repo.groupByErrorReports(),
    repo.findAuditLogsRecent(AUDIT_INSIGHTS_LIMIT, {
      user: { select: { username: true } },
    }),
    repo.findCreditSalesWithPayments({
      isCreditSale: true,
      createdAt: { gte: weekAgo },
    }),
    repo.findCreditSalesWithPayments({
      isCreditSale: true,
      createdAt: { gte: twoWeeksAgo, lt: weekAgo },
    }),
    repo.aggregateSaleDiscount({ createdAt: { gte: weekAgo } }),
    repo.countLocationInventoryNegative({ quantity: { lt: 0 } }),
  ]);

  const creditOutstanding = (
    sales: Awaited<ReturnType<typeof repo.findCreditSalesWithPayments>>,
  ) =>
    sales.reduce(
      (sum, s) =>
        sum +
        Math.max(
          0,
          Number(s.total) -
            s.payments.reduce((a, p) => a + Number(p.amount), 0),
        ),
      0,
    );
  const thisWeekCredit = creditOutstanding(creditSalesThisWeek);
  const lastWeekCredit = creditOutstanding(creditSalesLastWeek);
  const creditOutstandingDelta = thisWeekCredit - lastWeekCredit;

  const errorMap = Object.fromEntries(
    errorReportCounts.map((e) => [e.status, e._count]),
  );

  return {
    activeUsersToday,
    totalWorkspaces: 1,
    errorReportsOpen: errorMap.OPEN ?? 0,
    errorReportsResolved: errorMap.RESOLVED ?? 0,
    auditInsights: auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      resource: log.resource,
      username: log.user.username,
      createdAt: log.createdAt.toISOString(),
    })),
    riskIndicators: {
      highDiscountUsage: Number(discountAgg._sum?.discount) ?? 0,
      creditOutstandingDelta,
    },
    dataIntegrity: {
      negativeStockCount,
    },
  };
}
