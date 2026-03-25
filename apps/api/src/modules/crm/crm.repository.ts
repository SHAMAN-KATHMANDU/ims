import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

/** Only count the current revision of each deal; exclude soft-deleted rows. */
function baseDealWhere(
  tenantId: string,
  extra: Prisma.DealWhereInput = {},
): Prisma.DealWhereInput {
  return {
    tenantId,
    deletedAt: null,
    isLatest: true,
    ...extra,
  };
}

function startOfMonth(d: Date): Date {
  const out = new Date(d);
  out.setDate(1);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function endOfMonth(d: Date): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + 1);
  out.setDate(0);
  out.setUTCHours(23, 59, 59, 999);
  return out;
}

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

export interface DashboardRawData {
  totalDealsValue: { _sum: { value: unknown } };
  dealsClosingThisMonth: number;
  tasksDueToday: number;
  leadStats: Array<{ status: string; _count: number }>;
  monthlyRevenue: Array<{ value: unknown; closedAt: Date | null }>;
  recentActivities: Array<unknown>;
}

export class CrmRepository {
  async getDashboardData(tenantId: string): Promise<DashboardRawData> {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const [
      totalDealsValue,
      dealsClosingThisMonth,
      tasksDueToday,
      leadStats,
      monthlyRevenue,
      recentActivities,
    ] = await Promise.all([
      prisma.deal.aggregate({
        where: baseDealWhere(tenantId, { status: "OPEN" }),
        _sum: { value: true },
      }),
      prisma.deal.count({
        where: baseDealWhere(tenantId, {
          status: "OPEN",
          expectedCloseDate: {
            gte: thisMonthStart,
            lte: thisMonthEnd,
          },
        }),
      }),
      prisma.task.count({
        where: {
          tenantId,
          deletedAt: null,
          completed: false,
          dueDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.lead.groupBy({
        by: ["status"],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      prisma.deal.findMany({
        where: baseDealWhere(tenantId, { status: "WON" }),
        select: { value: true, closedAt: true },
      }),
      prisma.activity.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { activityAt: "desc" },
        take: 10,
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          deal: { select: { id: true, name: true } },
          creator: { select: { id: true, username: true } },
        },
      }),
    ]);

    return {
      totalDealsValue,
      dealsClosingThisMonth,
      tasksDueToday,
      leadStats,
      monthlyRevenue,
      recentActivities,
    };
  }

  async getReportsData(tenantId: string, year: number) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const [dealsWon, dealsLost, leadsBySource, salesPerUser, monthlyRevenue] =
      await Promise.all([
        prisma.deal.count({
          where: baseDealWhere(tenantId, {
            status: "WON",
            closedAt: { gte: startOfYear, lte: endOfYear },
          }),
        }),
        prisma.deal.count({
          where: baseDealWhere(tenantId, {
            status: "LOST",
            closedAt: { gte: startOfYear, lte: endOfYear },
          }),
        }),
        prisma.lead.groupBy({
          by: ["source"],
          _count: true,
          where: { tenantId, deletedAt: null, source: { not: null } },
        }),
        prisma.deal.groupBy({
          by: ["assignedToId"],
          where: baseDealWhere(tenantId, {
            status: "WON",
            closedAt: { gte: startOfYear, lte: endOfYear },
          }),
          _count: true,
          _sum: { value: true },
        }),
        prisma.deal.findMany({
          where: baseDealWhere(tenantId, {
            status: "WON",
            closedAt: { gte: startOfYear, lte: endOfYear },
          }),
          select: { value: true, closedAt: true },
        }),
      ]);

    const userIds = [...new Set(salesPerUser.map((s) => s.assignedToId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });

    return {
      dealsWon,
      dealsLost,
      leadsBySource,
      salesPerUser,
      monthlyRevenue,
      userMap: Object.fromEntries(users.map((u) => [u.id, u.username])),
    };
  }

  async getExportData(tenantId: string, year: number) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const [dealsWon, dealsLost, salesPerUser, leadsBySource] =
      await Promise.all([
        prisma.deal.count({
          where: baseDealWhere(tenantId, {
            status: "WON",
            closedAt: { gte: startOfYear, lte: endOfYear },
          }),
        }),
        prisma.deal.count({
          where: baseDealWhere(tenantId, {
            status: "LOST",
            closedAt: { gte: startOfYear, lte: endOfYear },
          }),
        }),
        prisma.deal.groupBy({
          by: ["assignedToId"],
          where: baseDealWhere(tenantId, {
            status: "WON",
            closedAt: { gte: startOfYear, lte: endOfYear },
          }),
          _count: true,
          _sum: { value: true },
        }),
        prisma.lead.groupBy({
          by: ["source"],
          _count: true,
          where: { tenantId, deletedAt: null, source: { not: null } },
        }),
      ]);

    const userIds = [...new Set(salesPerUser.map((s) => s.assignedToId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]));

    return {
      year,
      dealsWon,
      dealsLost,
      salesPerUser,
      leadsBySource,
      userMap,
    };
  }
}

export default new CrmRepository();
