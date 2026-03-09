import ExcelJS from "exceljs";
import crmRepository from "./crm.repository";

export class CrmService {
  async getDashboard(tenantId: string) {
    const raw = await crmRepository.getDashboardData(tenantId);

    const totalLeads = raw.leadStats.reduce((sum, s) => sum + s._count, 0);
    const convertedLeads =
      raw.leadStats.find((s) => s.status === "CONVERTED")?._count ?? 0;
    const conversionRate =
      totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    const now = new Date();
    const revenueByMonth: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      revenueByMonth[key] = 0;
    }
    raw.monthlyRevenue.forEach((d) => {
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
      totalDealsValue: Number(raw.totalDealsValue._sum?.value ?? 0),
      dealsClosingThisMonth: raw.dealsClosingThisMonth,
      tasksDueToday: raw.tasksDueToday,
      leadConversionRate: Math.round(conversionRate * 100) / 100,
      totalLeads,
      convertedLeads,
      monthlyRevenueChart,
      activitySummary: raw.recentActivities,
    };
  }

  async getReports(tenantId: string, year: number) {
    const raw = await crmRepository.getReportsData(tenantId, year);

    const totalWonValue = raw.monthlyRevenue.reduce(
      (sum, d) => sum + Number(d.value),
      0,
    );
    const conversionRate =
      raw.dealsWon + raw.dealsLost > 0
        ? (raw.dealsWon / (raw.dealsWon + raw.dealsLost)) * 100
        : 0;

    const salesPerUserData = raw.salesPerUser.map((s) => ({
      userId: s.assignedToId,
      username: raw.userMap[s.assignedToId] ?? "Unknown",
      dealCount: s._count,
      totalValue: Number(s._sum?.value ?? 0),
    }));

    const leadsBySourceData = raw.leadsBySource.map((s) => ({
      source: s.source ?? "Unknown",
      count: s._count,
    }));

    const revenueByMonth: Record<string, number> = {};
    for (let m = 1; m <= 12; m++) {
      revenueByMonth[`${year}-${String(m).padStart(2, "0")}`] = 0;
    }
    raw.monthlyRevenue.forEach((d) => {
      if (d.closedAt) {
        const key = `${d.closedAt.getFullYear()}-${String(d.closedAt.getMonth() + 1).padStart(2, "0")}`;
        if (revenueByMonth[key] !== undefined) {
          revenueByMonth[key] += Number(d.value);
        }
      }
    });

    return {
      year,
      dealsWon: raw.dealsWon,
      dealsLost: raw.dealsLost,
      totalRevenue: totalWonValue,
      conversionRate: Math.round(conversionRate * 100) / 100,
      salesPerUser: salesPerUserData,
      leadsBySource: leadsBySourceData,
      monthlyRevenue: Object.entries(revenueByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, revenue]) => ({ month, revenue })),
    };
  }

  async exportReportsExcel(tenantId: string, year: number): Promise<Buffer> {
    const raw = await crmRepository.getExportData(tenantId, year);

    const workbook = new ExcelJS.Workbook();
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
      { header: "Metric", key: "metric", width: 30 },
      { header: "Value", key: "value", width: 20 },
    ];
    const conversionRate =
      raw.dealsWon + raw.dealsLost > 0
        ? ((raw.dealsWon / (raw.dealsWon + raw.dealsLost)) * 100).toFixed(2)
        : "0";
    summarySheet.addRows([
      { metric: "Year", value: raw.year },
      { metric: "Deals Won", value: raw.dealsWon },
      { metric: "Deals Lost", value: raw.dealsLost },
      { metric: "Conversion Rate", value: `${conversionRate}%` },
    ]);

    const salesSheet = workbook.addWorksheet("Sales per User");
    salesSheet.columns = [
      { header: "User", key: "username", width: 25 },
      { header: "Deals Won", key: "dealCount", width: 15 },
      { header: "Total Value", key: "totalValue", width: 15 },
    ];
    raw.salesPerUser.forEach((s) => {
      salesSheet.addRow({
        username: raw.userMap[s.assignedToId] ?? "Unknown",
        dealCount: s._count,
        totalValue: Number(s._sum?.value ?? 0),
      });
    });

    const leadsSheet = workbook.addWorksheet("Leads by Source");
    leadsSheet.columns = [
      { header: "Source", key: "source", width: 30 },
      { header: "Count", key: "count", width: 15 },
    ];
    raw.leadsBySource.forEach((s) => {
      leadsSheet.addRow({ source: s.source ?? "Unknown", count: s._count });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }
}

export default new CrmService();
