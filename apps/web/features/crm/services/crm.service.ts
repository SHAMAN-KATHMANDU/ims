import api from "@/lib/axios";

export interface CrmDashboardData {
  totalDealsValue: number;
  dealsClosingThisMonth: number;
  tasksDueToday: number;
  leadConversionRate: number;
  totalLeads: number;
  convertedLeads: number;
  monthlyRevenueChart: Array<{ month: string; revenue: number }>;
  activitySummary: Array<{
    id: string;
    type: string;
    subject?: string | null;
    activityAt: string;
    contact?: {
      id: string;
      firstName: string;
      lastName?: string | null;
    } | null;
    deal?: { id: string; name: string } | null;
    creator?: { id: string; username: string } | null;
  }>;
}

export interface CrmReportsData {
  year: number;
  dealsWon: number;
  dealsLost: number;
  totalRevenue: number;
  conversionRate: number;
  salesPerUser: Array<{
    userId: string;
    username: string;
    dealCount: number;
    totalValue: number;
  }>;
  leadsBySource: Array<{ source: string; count: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
}

export async function getCrmDashboard(): Promise<{ data: CrmDashboardData }> {
  const res = await api.get("/crm/dashboard");
  return res.data;
}

export async function getCrmReports(
  year?: number,
): Promise<{ data: CrmReportsData }> {
  const res = await api.get("/crm/reports", {
    params: year ? { year } : {},
  });
  return res.data;
}

export async function exportCrmReports(year?: number): Promise<Blob> {
  const res = await api.get("/crm/reports/export", {
    params: year ? { year } : {},
    responseType: "blob",
  });
  return res.data;
}
