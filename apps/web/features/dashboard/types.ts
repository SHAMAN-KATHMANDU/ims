/**
 * Dashboard feature types.
 */

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
