/**
 * CRM service: dashboard, reports, and export logic.
 * Uses repository for all data access; no Prisma in this file.
 */

import ExcelJS from "exceljs";
import * as repo from "./crm.repository";

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

function startOfYear(year: number): Date {
  return new Date(year, 0, 1);
}

function endOfYear(year: number): Date {
  return new Date(year, 11, 31, 23, 59, 59);
}

export type DashboardData = {
  totalDealsValue: number;
  dealsClosingThisMonth: number;
  tasksDueToday: number;
  leadConversionRate: number;
  totalLeads: number;
  convertedLeads: number;
  monthlyRevenueChart: { month: string; revenue: number }[];
  activitySummary: Awaited<ReturnType<typeof repo.findActivitiesRecent>>;
};

export async function getDashboard(tenantId: string): Promise<DashboardData> {
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
    repo.aggregateDealsSum({ tenantId, status: "OPEN" }),
    repo.countDeals({
      tenantId,
      status: "OPEN",
      expectedCloseDate: {
        gte: thisMonthStart,
        lte: thisMonthEnd,
      },
    }),
    repo.countTasks({
      tenantId,
      completed: false,
      dueDate: { gte: todayStart, lte: todayEnd },
    }),
    repo.groupLeadsByStatus(tenantId),
    repo.findDeals(
      { tenantId, status: "WON" },
      { value: true, closedAt: true },
    ),
    repo.findActivitiesRecent(tenantId, 10, {
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, name: true } },
      creator: { select: { id: true, username: true } },
    }),
  ]);

  const totalLeads = leadStats.reduce((sum, s) => sum + s._count, 0);
  const convertedLeads =
    leadStats.find((s) => s.status === "CONVERTED")?._count ?? 0;
  const conversionRate =
    totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  const revenueByMonth: Record<string, number> = {};
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    revenueByMonth[key] = 0;
  }
  monthlyRevenue.forEach((d) => {
    if (d.closedAt) {
      const key = `${d.closedAt.getFullYear()}-${String(d.closedAt.getMonth() + 1).padStart(2, "0")}`;
      if (revenueByMonth[key] !== undefined) {
        revenueByMonth[key] += Number(d.value);
      }
    }
  });

  const monthlyRevenueChart = Object.entries(revenueByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({ month, revenue }));

  return {
    totalDealsValue: Number(totalDealsValue._sum?.value ?? 0),
    dealsClosingThisMonth,
    tasksDueToday,
    leadConversionRate: Math.round(conversionRate * 100) / 100,
    totalLeads,
    convertedLeads,
    monthlyRevenueChart,
    activitySummary: recentActivities,
  };
}

export type ReportsData = {
  year: number;
  dealsWon: number;
  dealsLost: number;
  totalRevenue: number;
  conversionRate: number;
  salesPerUser: {
    userId: string;
    username: string;
    dealCount: number;
    totalValue: number;
  }[];
  leadsBySource: { source: string; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
};

export async function getReports(
  tenantId: string,
  year?: number,
): Promise<ReportsData> {
  const reportYear = year ?? new Date().getFullYear();
  const startOfYearDate = startOfYear(reportYear);
  const endOfYearDate = endOfYear(reportYear);

  const whereWonInYear = {
    tenantId,
    status: "WON" as const,
    closedAt: { gte: startOfYearDate, lte: endOfYearDate },
  };

  const [dealsWon, dealsLost, leadsBySource, salesPerUser, monthlyRevenue] =
    await Promise.all([
      repo.countDeals(whereWonInYear),
      repo.countDeals({
        tenantId,
        status: "LOST",
        closedAt: { gte: startOfYearDate, lte: endOfYearDate },
      }),
      repo.groupLeadsBySource(tenantId),
      repo.groupDealsByAssigned(whereWonInYear),
      repo.findDeals(whereWonInYear, { value: true, closedAt: true }),
    ]);

  const totalWonValue = monthlyRevenue.reduce(
    (sum, d) => sum + Number(d.value),
    0,
  );
  const conversionRate =
    dealsWon + dealsLost > 0 ? (dealsWon / (dealsWon + dealsLost)) * 100 : 0;

  const userIds = [...new Set(salesPerUser.map((s) => s.assignedToId))];
  const users = await repo.findUsersByIds(tenantId, userIds, {
    id: true,
    username: true,
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]));

  const salesPerUserData = salesPerUser.map((s) => ({
    userId: s.assignedToId,
    username: userMap[s.assignedToId] ?? "Unknown",
    dealCount: s._count,
    totalValue: Number(s._sum?.value ?? 0),
  }));

  const leadsBySourceData = leadsBySource.map((s) => ({
    source: s.source ?? "Unknown",
    count: s._count,
  }));

  const revenueByMonth: Record<string, number> = {};
  for (let m = 1; m <= 12; m++) {
    revenueByMonth[`${reportYear}-${String(m).padStart(2, "0")}`] = 0;
  }
  monthlyRevenue.forEach((d) => {
    if (d.closedAt) {
      const key = `${d.closedAt.getFullYear()}-${String(d.closedAt.getMonth() + 1).padStart(2, "0")}`;
      if (revenueByMonth[key] !== undefined) {
        revenueByMonth[key] += Number(d.value);
      }
    }
  });

  return {
    year: reportYear,
    dealsWon,
    dealsLost,
    totalRevenue: totalWonValue,
    conversionRate: Math.round(conversionRate * 100) / 100,
    salesPerUser: salesPerUserData,
    leadsBySource: leadsBySourceData,
    monthlyRevenue: Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue })),
  };
}

export type ExportResult = { buffer: Buffer; filename: string };

export async function exportReports(
  tenantId: string,
  year?: number,
): Promise<ExportResult> {
  const reportYear = year ?? new Date().getFullYear();
  const startOfYearDate = startOfYear(reportYear);
  const endOfYearDate = endOfYear(reportYear);

  const whereWonInYear = {
    tenantId,
    status: "WON" as const,
    closedAt: { gte: startOfYearDate, lte: endOfYearDate },
  };

  const [dealsWon, dealsLost, salesPerUser, leadsBySource] = await Promise.all([
    repo.countDeals(whereWonInYear),
    repo.countDeals({
      tenantId,
      status: "LOST",
      closedAt: { gte: startOfYearDate, lte: endOfYearDate },
    }),
    repo.groupDealsByAssigned(whereWonInYear),
    repo.groupLeadsBySource(tenantId),
  ]);

  const userIds = [...new Set(salesPerUser.map((s) => s.assignedToId))];
  const users = await repo.findUsersByIds(tenantId, userIds, {
    id: true,
    username: true,
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]));

  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 20 },
  ];
  summarySheet.addRows([
    { metric: "Year", value: reportYear },
    { metric: "Deals Won", value: dealsWon },
    { metric: "Deals Lost", value: dealsLost },
    {
      metric: "Conversion Rate",
      value: `${dealsWon + dealsLost > 0 ? ((dealsWon / (dealsWon + dealsLost)) * 100).toFixed(2) : 0}%`,
    },
  ]);

  const salesSheet = workbook.addWorksheet("Sales per User");
  salesSheet.columns = [
    { header: "User", key: "username", width: 25 },
    { header: "Deals Won", key: "dealCount", width: 15 },
    { header: "Total Value", key: "totalValue", width: 15 },
  ];
  salesPerUser.forEach((s) => {
    salesSheet.addRow({
      username: userMap[s.assignedToId] ?? "Unknown",
      dealCount: s._count,
      totalValue: Number(s._sum?.value ?? 0),
    });
  });

  const leadsSheet = workbook.addWorksheet("Leads by Source");
  leadsSheet.columns = [
    { header: "Source", key: "source", width: 30 },
    { header: "Count", key: "count", width: 15 },
  ];
  leadsBySource.forEach((s) => {
    leadsSheet.addRow({ source: s.source ?? "Unknown", count: s._count });
  });

  const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  return {
    buffer,
    filename: `crm-reports-${reportYear}-${Date.now()}.xlsx`,
  };
}
