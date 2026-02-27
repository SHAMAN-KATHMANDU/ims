import { Request, Response } from "express";
import { sendControllerError } from "@/utils/controllerError";
import prisma from "@/config/prisma";
import { getTenantId } from "@/config/tenantContext";
import { getCached, setCached } from "./dashboardCache";
import type {
  DashboardUserSummary,
  DashboardAdminSummary,
  DashboardSuperAdminSummary,
} from "./dashboard.types";

/**
 * LocationInventory has no tenantId column — scope via location.tenantId.
 * Returns a where clause fragment that restricts rows to the current tenant.
 */
function locationInventoryTenantWhere(
  existingWhere: Record<string, unknown> = {},
): Record<string, unknown> {
  const tenantId = getTenantId();
  if (!tenantId) return existingWhere;
  return {
    ...existingWhere,
    location: {
      ...((existingWhere.location as Record<string, unknown>) ?? {}),
      tenantId,
    },
  };
}

// Overdue = credit sale with balance > 0 and older than N days (no dueDate on Sale)
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

class DashboardController {
  /**
   * User dashboard: all data scoped to current user (createdById = req.user.id).
   * Separate from GET /sales/analytics/summary so analytics remains system-wide for admins.
   */
  async getUserSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id as string | undefined;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const cacheKey = "user-summary";
      const cached = getCached(cacheKey, userId);
      if (cached) {
        return res.status(200).json({ message: "OK", data: cached });
      }

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
          where: {
            ...baseWhere,
            isCreditSale: true,
          },
          select: {
            id: true,
            saleCode: true,
            total: true,
            createdAt: true,
            payments: { select: { amount: true } },
          },
        }),
        prisma.sale.aggregate({
          where: {
            ...baseWhere,
            createdAt: { gte: since },
          },
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

      const creditOutstanding = creditSalesWithPayments.reduce(
        (sum, s) =>
          sum +
          Math.max(
            0,
            Number(s.total) -
              s.payments.reduce((a, p) => a + Number(p.amount), 0),
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

      const data: DashboardUserSummary = {
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

      setCached(cacheKey, userId, data);
      res.status(200).json({ message: "OK", data });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Dashboard getUserSummary error",
      );
    }
  }

  /**
   * Admin dashboard: business-level aggregates and alerts.
   * Lightweight queries only; deep analysis stays in analytics.
   */
  async getAdminSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id as string | undefined;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const cacheKey = "admin-summary";
      const cached = getCached(cacheKey, userId);
      if (cached) {
        return res.status(200).json({ message: "OK", data: cached });
      }

      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);
      const overdueCutoff = daysAgo(OVERDUE_CREDIT_DAYS);

      const [
        todayRevenueAgg,
        allCreditSales,
        inventoryRows,
        lowStockCount,
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
          where: locationInventoryTenantWhere() as any,
          select: {
            quantity: true,
            variation: {
              select: {
                product: { select: { costPrice: true, mrp: true } },
              },
            },
          },
        }),
        // Low stock by variant: count variants whose total (across all locations) is < threshold
        prisma.locationInventory
          .groupBy({
            by: ["variationId"],
            where: locationInventoryTenantWhere() as any,
            _sum: { quantity: true },
          })
          .then(
            (rows) =>
              rows.filter(
                (r) => Number(r._sum?.quantity ?? 0) < LOW_STOCK_THRESHOLD,
              ).length,
          ),
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

      const creditOutstanding = allCreditSales.reduce(
        (sum, s) =>
          sum +
          Math.max(
            0,
            Number(s.total) -
              s.payments.reduce((a, p) => a + Number(p.amount), 0),
          ),
        0,
      );
      const overdueCreditCount = allCreditSales.filter((s) => {
        const balance =
          Number(s.total) -
          s.payments.reduce((a, p) => a + Number(p.amount), 0);
        return balance > 0 && s.createdAt < overdueCutoff;
      }).length;

      const transferStatusMap = Object.fromEntries(
        transferCounts.map((t) => [t.status, t._count]),
      );
      const failedTransferCount = transferStatusMap.CANCELLED ?? 0;

      const inventoryValue = inventoryRows.reduce(
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

      const locationIds = [
        ...new Set(locationRevenue.map((r) => r.locationId)),
      ];
      const locations =
        locationIds.length > 0
          ? await prisma.location.findMany({
              where: { id: { in: locationIds } },
              select: { id: true, name: true },
            })
          : [];
      const locationNameMap = Object.fromEntries(
        locations.map((l) => [l.id, l.name]),
      );
      const locationSnapshot = locationRevenue.map((r) => ({
        locationId: r.locationId,
        locationName: locationNameMap[r.locationId] ?? r.locationId,
        revenue: Number(r._sum?.total) ?? 0,
      }));

      const data: DashboardAdminSummary = {
        todayRevenue: Number(todayRevenueAgg._sum?.total) ?? 0,
        netRevenue: Number(todayRevenueAgg._sum?.total) ?? 0,
        creditOutstanding,
        inventoryValue,
        alerts: {
          lowStockCount,
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
        lowStockCount,
      };

      setCached(cacheKey, userId, data);
      res.status(200).json({ message: "OK", data });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Dashboard getAdminSummary error",
      );
    }
  }

  /**
   * Super Admin dashboard: system health, audit, risk, data integrity.
   * No sales micromanagement; focus on governance and anomalies.
   */
  async getSuperAdminSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id as string | undefined;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const cacheKey = "superadmin-summary";
      const cached = getCached(cacheKey, userId);
      if (cached) {
        return res.status(200).json({ message: "OK", data: cached });
      }

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

      const creditOutstanding = (sales: typeof creditSalesThisWeek) =>
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

      // No workspace table; app uses single segment (e.g. /admin)
      const data: DashboardSuperAdminSummary = {
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

      setCached(cacheKey, userId, data);
      res.status(200).json({ message: "OK", data });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Dashboard getSuperAdminSummary error",
      );
    }
  }
}

export default new DashboardController();
