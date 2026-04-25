import dashboardRepository from "./dashboard.repository";
import { getCached, setCached } from "./dashboardCache";
import { getTenantId } from "@/config/tenantContext";
import type {
  DashboardUserSummary,
  DashboardAdminSummary,
  DashboardSuperAdminSummary,
} from "./dashboard.types";

export class DashboardService {
  async getUserSummary(userId: string): Promise<DashboardUserSummary> {
    const cacheKey = "user-summary";
    const cached = getCached(cacheKey, userId);
    if (cached) return cached as DashboardUserSummary;

    const raw = await dashboardRepository.getUserSummaryData(userId);

    const creditOutstanding = raw.creditSalesWithPayments.reduce(
      (sum, s) =>
        sum +
        Math.max(
          0,
          Number(s.total) -
            s.payments.reduce((a, p) => a + Number(p.amount), 0),
        ),
      0,
    );

    const pendingCreditSales = raw.creditSalesWithPayments
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

    const today = raw.today;
    const trendByDay: Record<string, { revenue: number; count: number }> = {};
    for (let i = 0; i < raw.PERSONAL_TREND_DAYS; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (raw.PERSONAL_TREND_DAYS - 1 - i));
      const key = d.toISOString().slice(0, 10);
      trendByDay[key] = { revenue: 0, count: 0 };
    }
    raw.salesForTrend.forEach((s) => {
      const d = new Date(s.createdAt);
      if (d < raw.trendStart) return;
      const key = d.toISOString().slice(0, 10);
      if (trendByDay[key] != null) {
        trendByDay[key].revenue += Number(s.total);
        trendByDay[key].count += 1;
      }
    });
    const personalTrend = Object.entries(trendByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, revenue: v.revenue, count: v.count }));

    const data: DashboardUserSummary = {
      mySalesToday: raw.todayStats._count ?? 0,
      myRevenueToday: Number(raw.todayStats._sum?.total ?? 0),
      myCreditOutstanding: creditOutstanding,
      sinceLastLogin: {
        salesCount: raw.sinceLoginStats._count ?? 0,
        revenue: Number(raw.sinceLoginStats._sum?.total ?? 0),
      },
      pendingCreditCount: pendingCreditSales.length,
      pendingCreditSales,
      recentSales: raw.recentSalesList.map((s) => ({
        id: s.id,
        saleCode: s.saleCode,
        total: Number(s.total),
        createdAt: s.createdAt.toISOString(),
        locationName: s.location.name,
      })),
      personalTrend,
    };

    setCached(cacheKey, userId, data);
    return data;
  }

  async getAdminSummary(userId: string): Promise<DashboardAdminSummary> {
    const cacheKey = "admin-summary";
    const cached = getCached(cacheKey, userId);
    if (cached) return cached as DashboardAdminSummary;

    const tenantId = getTenantId();
    const raw = await dashboardRepository.getAdminSummaryData(tenantId);

    const creditOutstanding = raw.allCreditSales.reduce(
      (sum, s) =>
        sum +
        Math.max(
          0,
          Number(s.total) -
            s.payments.reduce((a, p) => a + Number(p.amount), 0),
        ),
      0,
    );
    const overdueCreditCount = raw.allCreditSales.filter((s) => {
      const balance =
        Number(s.total) - s.payments.reduce((a, p) => a + Number(p.amount), 0);
      return balance > 0 && s.createdAt < raw.overdueCutoff;
    }).length;

    const transferStatusMap = Object.fromEntries(
      raw.transferCounts.map((t) => [t.status, t._count]),
    );
    const failedTransferCount = transferStatusMap.CANCELLED ?? 0;

    const inventoryValue = raw.inventoryRows.reduce(
      (sum, row) =>
        sum +
        row.quantity *
          Number(
            row.variation?.product?.costPrice ??
              row.variation?.product?.mrp ??
              0,
          ),
      0,
    );

    const locationNameMap = Object.fromEntries(
      raw.locations.map((l) => [l.id, l.name]),
    );
    const locationSnapshot = raw.locationRevenue.map((r) => ({
      locationId: r.locationId,
      locationName: locationNameMap[r.locationId] ?? r.locationId,
      revenue: Number(r._sum?.total ?? 0),
    }));

    const data: DashboardAdminSummary = {
      todayRevenue: Number(raw.todayRevenueAgg._sum?.total ?? 0),
      netRevenue: Number(raw.todayRevenueAgg._sum?.total ?? 0),
      creditOutstanding,
      inventoryValue,
      alerts: {
        lowStockCount: raw.lowStockCount,
        overdueCreditCount,
        failedTransferCount,
      },
      locationSnapshot,
      transferStatusCounts: {
        pending: transferStatusMap.PENDING ?? 0,
        inTransit: transferStatusMap.IN_TRANSIT ?? 0,
        completed: transferStatusMap.COMPLETED ?? 0,
        cancelled: transferStatusMap.CANCELLED ?? 0,
      },
      lowStockCount: raw.lowStockCount,
    };

    setCached(cacheKey, userId, data);
    return data;
  }

  async getSuperAdminSummary(
    userId: string,
  ): Promise<DashboardSuperAdminSummary> {
    const cacheKey = "superadmin-summary";
    const cached = getCached(cacheKey, userId);
    if (cached) return cached as DashboardSuperAdminSummary;

    const raw = await dashboardRepository.getSuperAdminSummaryData();

    const creditOutstanding = (sales: typeof raw.creditSalesThisWeek) =>
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
    const thisWeekCredit = creditOutstanding(raw.creditSalesThisWeek);
    const lastWeekCredit = creditOutstanding(raw.creditSalesLastWeek);
    const creditOutstandingDelta = thisWeekCredit - lastWeekCredit;

    const errorMap = Object.fromEntries(
      raw.errorReportCounts.map((e) => [e.status, e._count]),
    );

    const data: DashboardSuperAdminSummary = {
      activeUsersToday: raw.activeUsersToday,
      totalWorkspaces: 1,
      errorReportsOpen: errorMap.OPEN ?? 0,
      errorReportsResolved: errorMap.RESOLVED ?? 0,
      auditInsights: raw.auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        username: log.user.username,
        createdAt: log.createdAt.toISOString(),
      })),
      riskIndicators: {
        highDiscountUsage: Number(raw.discountAgg._sum?.discount ?? 0),
        creditOutstandingDelta,
      },
      dataIntegrity: {
        negativeStockCount: raw.negativeStockCount,
      },
    };

    setCached(cacheKey, userId, data);
    return data;
  }
}

export default new DashboardService();
