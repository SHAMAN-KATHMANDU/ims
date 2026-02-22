import { Request, Response } from "express";
import prisma from "@/config/prisma";
import ExcelJS from "exceljs";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { sendControllerError } from "@/utils/controllerError";

function getUserId(req: Request): string | null {
  return (req as any).user?.id ?? null;
}

function getTenantId(req: Request): string | null {
  return req.tenant?.id ?? (req as any).user?.tenantId ?? null;
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

class CrmController {
  async getDashboard(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const tenantId = getTenantId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });
      if (!tenantId)
        return res.status(401).json({ message: "Tenant context is required" });

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
          where: { tenantId, status: "OPEN" },
          _sum: { value: true },
        }),
        prisma.deal.count({
          where: {
            tenantId,
            status: "OPEN",
            expectedCloseDate: {
              gte: thisMonthStart,
              lte: thisMonthEnd,
            },
          },
        }),
        prisma.task.count({
          where: {
            tenantId,
            completed: false,
            dueDate: { gte: todayStart, lte: todayEnd },
          },
        }),
        prisma.lead.groupBy({
          by: ["status"],
          where: { tenantId },
          _count: true,
        }),
        prisma.deal.findMany({
          where: { tenantId, status: "WON" },
          select: { value: true, closedAt: true },
        }),
        prisma.activity.findMany({
          where: { tenantId },
          orderBy: { activityAt: "desc" },
          take: 10,
          include: {
            contact: { select: { id: true, firstName: true, lastName: true } },
            deal: { select: { id: true, name: true } },
            creator: { select: { id: true, username: true } },
          },
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

      res.status(200).json({
        message: "OK",
        data: {
          totalDealsValue: Number(totalDealsValue._sum?.value ?? 0),
          dealsClosingThisMonth,
          tasksDueToday,
          leadConversionRate: Math.round(conversionRate * 100) / 100,
          totalLeads,
          convertedLeads,
          monthlyRevenueChart,
          activitySummary: recentActivities,
        },
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "CRM dashboard error");
    }
  }

  async getReports(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const tenantId = getTenantId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });
      if (!tenantId)
        return res.status(401).json({ message: "Tenant context is required" });

      const { year } = getValidatedQuery<{ year?: number }>(req, res);
      const reportYear = year ?? new Date().getFullYear();
      const startOfYear = new Date(reportYear, 0, 1);
      const endOfYear = new Date(reportYear, 11, 31, 23, 59, 59);

      const [dealsWon, dealsLost, leadsBySource, salesPerUser, monthlyRevenue] =
        await Promise.all([
          prisma.deal.count({
            where: {
              tenantId,
              status: "WON",
              closedAt: { gte: startOfYear, lte: endOfYear },
            },
          }),
          prisma.deal.count({
            where: {
              tenantId,
              status: "LOST",
              closedAt: { gte: startOfYear, lte: endOfYear },
            },
          }),
          prisma.lead.groupBy({
            by: ["source"],
            _count: true,
            where: { tenantId, source: { not: null } },
          }),
          prisma.deal.groupBy({
            by: ["assignedToId"],
            where: {
              tenantId,
              status: "WON",
              closedAt: { gte: startOfYear, lte: endOfYear },
            },
            _count: true,
            _sum: { value: true },
          }),
          prisma.deal.findMany({
            where: {
              tenantId,
              status: "WON",
              closedAt: { gte: startOfYear, lte: endOfYear },
            },
            select: { value: true, closedAt: true },
          }),
        ]);

      const totalWonValue = monthlyRevenue.reduce(
        (sum, d) => sum + Number(d.value),
        0,
      );
      const conversionRate =
        dealsWon + dealsLost > 0
          ? (dealsWon / (dealsWon + dealsLost)) * 100
          : 0;

      const userIds = [...new Set(salesPerUser.map((s) => s.assignedToId))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, tenantId },
        select: { id: true, username: true },
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

      res.status(200).json({
        message: "OK",
        data: {
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
        },
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "CRM reports error");
    }
  }

  async exportReportsCsv(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const tenantId = getTenantId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });
      if (!tenantId)
        return res.status(401).json({ message: "Tenant context is required" });

      const { year } = getValidatedQuery<{ year?: number }>(req, res);
      const reportYear = year ?? new Date().getFullYear();
      const startOfYear = new Date(reportYear, 0, 1);
      const endOfYear = new Date(reportYear, 11, 31, 23, 59, 59);

      const [dealsWon, dealsLost, salesPerUser, leadsBySource] =
        await Promise.all([
          prisma.deal.count({
            where: {
              tenantId,
              status: "WON",
              closedAt: { gte: startOfYear, lte: endOfYear },
            },
          }),
          prisma.deal.count({
            where: {
              tenantId,
              status: "LOST",
              closedAt: { gte: startOfYear, lte: endOfYear },
            },
          }),
          prisma.deal.groupBy({
            by: ["assignedToId"],
            where: {
              tenantId,
              status: "WON",
              closedAt: { gte: startOfYear, lte: endOfYear },
            },
            _count: true,
            _sum: { value: true },
          }),
          prisma.lead.groupBy({
            by: ["source"],
            _count: true,
            where: { tenantId, source: { not: null } },
          }),
        ]);

      const userIds = [...new Set(salesPerUser.map((s) => s.assignedToId))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, tenantId },
        select: { id: true, username: true },
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

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="crm-reports-${reportYear}-${Date.now()}.xlsx"`,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.send(Buffer.from(buffer));
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Export CRM reports error");
    }
  }
}

export default new CrmController();
