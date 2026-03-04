/**
 * Dashboard API calls. Dashboard uses its own lightweight endpoints;
 * do not call analytics endpoints from the dashboard.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export interface DashboardUserSummary {
  mySalesToday: number;
  myRevenueToday: number;
  myCreditOutstanding: number;
  sinceLastLogin: { salesCount: number; revenue: number };
  pendingCreditCount: number;
  pendingCreditSales: Array<{
    id: string;
    saleCode: string;
    total: number;
    paidTotal: number;
    balance: number;
    createdAt: string;
  }>;
  recentSales: Array<{
    id: string;
    saleCode: string;
    total: number;
    createdAt: string;
    locationName: string;
  }>;
  personalTrend: Array<{ date: string; revenue: number; count: number }>;
}

export interface DashboardAdminSummary {
  todayRevenue: number;
  netRevenue: number;
  creditOutstanding: number;
  inventoryValue: number;
  alerts: {
    lowStockCount: number;
    overdueCreditCount: number;
    failedTransferCount: number;
  };
  locationSnapshot: Array<{
    locationId: string;
    locationName: string;
    revenue: number;
  }>;
  transferStatusCounts: {
    pending: number;
    inTransit: number;
    completed: number;
    cancelled: number;
  };
  lowStockCount: number;
}

export interface DashboardSuperAdminSummary {
  activeUsersToday: number;
  totalWorkspaces: number;
  errorReportsOpen: number;
  errorReportsResolved: number;
  auditInsights: Array<{
    id: string;
    action: string;
    resource: string | null;
    username: string;
    createdAt: string;
  }>;
  riskIndicators: {
    highDiscountUsage: number;
    creditOutstandingDelta: number;
  };
  dataIntegrity: { negativeStockCount: number };
}

const STALE_TIME_MS = 3 * 60 * 1000; // 3 minutes for dashboard

export async function getDashboardUserSummary(): Promise<DashboardUserSummary> {
  try {
    const res = await api.get<{ message: string; data: DashboardUserSummary }>(
      "/dashboard/user-summary",
    );
    return res.data.data;
  } catch (e) {
    handleApiError(e, "fetch dashboard user summary");
    throw e;
  }
}

export async function getDashboardAdminSummary(): Promise<DashboardAdminSummary> {
  try {
    const res = await api.get<{ message: string; data: DashboardAdminSummary }>(
      "/dashboard/admin-summary",
    );
    return res.data.data;
  } catch (e) {
    handleApiError(e, "fetch dashboard admin summary");
    throw e;
  }
}

export async function getDashboardSuperAdminSummary(): Promise<DashboardSuperAdminSummary> {
  try {
    const res = await api.get<{
      message: string;
      data: DashboardSuperAdminSummary;
    }>("/dashboard/superadmin-summary");
    return res.data.data;
  } catch (e) {
    handleApiError(e, "fetch dashboard superadmin summary");
    throw e;
  }
}

export { STALE_TIME_MS as DASHBOARD_STALE_TIME_MS };
