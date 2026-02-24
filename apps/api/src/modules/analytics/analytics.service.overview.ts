/**
 * Analytics: overview report.
 */

import * as repo from "./analytics.repository";

export async function getOverview(tenantId: string) {
  const data = await repo.getOverviewData(tenantId);
  const usersByRole = [
    {
      role: "superAdmin" as const,
      count: data.allUsers.filter((u) => u.role === "superAdmin").length,
    },
    {
      role: "admin" as const,
      count: data.allUsers.filter((u) => u.role === "admin").length,
    },
    {
      role: "user" as const,
      count: data.allUsers.filter((u) => u.role === "user").length,
    },
  ];
  const totalValue = data.productsWithMrp.reduce(
    (sum, p) => sum + Number(p.mrp || 0),
    0,
  );
  return {
    analytics: {
      overview: {
        totalProducts: data.totalProducts,
        totalUsers: data.totalUsers,
        totalValue: totalValue.toFixed(2),
        averageProductPrice:
          data.totalProducts > 0
            ? (totalValue / data.totalProducts).toFixed(2)
            : "0.00",
      },
      usersByRole,
      recentProducts: data.recentProducts,
      recentUsers: data.recentUsers,
    },
  };
}
