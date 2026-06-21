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
  frameworkPipelines: Array<{
    id: string;
    name: string;
    type: string;
    stages: Prisma.JsonValue;
  }>;
  dealsByStage: Array<{
    pipelineId: string;
    stage: string;
    _count: number;
    _sum: { value: unknown };
  }>;
}

/** The three CRM framework pipelines surfaced on the dashboard funnel. */
const FRAMEWORK_PIPELINE_TYPES = [
  "NEW_SALES",
  "REMARKETING",
  "REPURCHASE",
] as const;

export class CrmRepository {
  async getDashboardData(tenantId: string): Promise<DashboardRawData> {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    // The funnel covers the three CRM framework pipelines (not GENERAL/other);
    // resolve them first so the open-deal-by-stage grouping can be filtered.
    const frameworkPipelines = await prisma.pipeline.findMany({
      where: {
        tenantId,
        deletedAt: null,
        type: { in: [...FRAMEWORK_PIPELINE_TYPES] },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, type: true, stages: true },
    });
    const frameworkPipelineIds = frameworkPipelines.map((p) => p.id);

    const [
      totalDealsValue,
      dealsClosingThisMonth,
      tasksDueToday,
      leadStats,
      monthlyRevenue,
      recentActivities,
      dealsByStage,
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
        select: {
          id: true,
          type: true,
          subject: true,
          activityAt: true,
          contact: { select: { id: true, firstName: true, lastName: true } },
          deal: { select: { id: true, name: true } },
          creator: { select: { id: true, username: true } },
        },
      }),
      frameworkPipelineIds.length
        ? prisma.deal.groupBy({
            by: ["pipelineId", "stage"],
            where: baseDealWhere(tenantId, {
              pipelineId: { in: frameworkPipelineIds },
              status: "OPEN",
            }),
            _count: true,
            _sum: { value: true },
          })
        : Promise.resolve([]),
    ]);

    return {
      totalDealsValue,
      dealsClosingThisMonth,
      tasksDueToday,
      leadStats,
      monthlyRevenue,
      recentActivities,
      frameworkPipelines,
      dealsByStage,
    };
  }

  async getReportsData(tenantId: string, year: number) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const [
      dealsWon,
      dealsLost,
      leadsBySource,
      salesPerUser,
      monthlyRevenue,
      staffActivity,
    ] = await Promise.all([
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
      // Per-user activity-type counts (calls/emails/meetings) for the staff table.
      prisma.activity.groupBy({
        by: ["createdById", "type"],
        where: {
          tenantId,
          deletedAt: null,
          activityAt: { gte: startOfYear, lte: endOfYear },
        },
        _count: true,
      }),
    ]);

    const userIds = [
      ...new Set([
        ...salesPerUser.map((s) => s.assignedToId),
        ...staffActivity.map((s) => s.createdById),
      ]),
    ];
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
      staffActivity,
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
