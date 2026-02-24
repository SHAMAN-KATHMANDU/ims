/**
 * Analytics: trends and patterns.
 */

import { getSalesWhereForAnalytics } from "./analytics.filters";
import { withTenant, monthDifference } from "./analytics.helpers";
import * as repo from "./analytics.repository";

export async function getTrends(
  tenantId: string,
  role: string | undefined,
  userId: string | undefined,
  query: Record<string, unknown>,
) {
  const { where } = getSalesWhereForAnalytics(query, role, userId);
  const w = withTenant(where, tenantId);
  const { sales, membersWithSales } = await repo.getTrendsData(tenantId, w);
  const monthlyMap: Record<
    string,
    { revenue: number; count: number; discount: number }
  > = {};
  const peakHours: number[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(0),
  );
  for (const sale of sales) {
    const d = sale.createdAt;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap[monthKey])
      monthlyMap[monthKey] = { revenue: 0, count: 0, discount: 0 };
    monthlyMap[monthKey].revenue += Number(sale.total);
    monthlyMap[monthKey].count += 1;
    monthlyMap[monthKey].discount += Number(sale.discount);
    peakHours[d.getDay()][d.getHours()] += Number(sale.total);
  }
  const monthlyTotals = Object.entries(monthlyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v], i, arr) => {
      const prev = i > 0 ? arr[i - 1][1].revenue : 0;
      const momGrowth =
        prev > 0 ? +(((v.revenue - prev) / prev) * 100).toFixed(1) : 0;
      return { month, ...v, momGrowth };
    });
  const overallAvg =
    monthlyTotals.length > 0
      ? monthlyTotals.reduce((s, m) => s + m.revenue, 0) / monthlyTotals.length
      : 0;
  const seasonalityIndex = monthlyTotals.map((m) => ({
    month: m.month,
    index: overallAvg > 0 ? +((m.revenue / overallAvg) * 100).toFixed(0) : 100,
  }));
  const cohortMap: Record<string, Set<string>[]> = {};
  for (const m of membersWithSales) {
    if (m.sales.length === 0) continue;
    const firstMonth = m.sales[0].createdAt.toISOString().slice(0, 7);
    if (!cohortMap[firstMonth]) cohortMap[firstMonth] = [];
    for (const sale of m.sales) {
      const saleMonth = sale.createdAt.toISOString().slice(0, 7);
      const monthDiff = monthDifference(firstMonth, saleMonth);
      while (cohortMap[firstMonth].length <= monthDiff)
        cohortMap[firstMonth].push(new Set());
      cohortMap[firstMonth][monthDiff].add(m.id);
    }
  }
  const cohortRetention = Object.entries(cohortMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, sets]) => ({
      cohortMonth: month,
      size: sets[0]?.size ?? 0,
      retention: sets.map((s, i) => ({
        monthOffset: i,
        activeCount: s.size,
        rate:
          sets[0].size > 0 ? +((s.size / sets[0].size) * 100).toFixed(0) : 0,
      })),
    }));
  const peakHoursFormatted = peakHours.map((hours, dayIdx) => ({
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayIdx],
    hours: hours.map((revenue, hour) => ({
      hour,
      revenue: Math.round(revenue),
    })),
  }));
  return {
    data: {
      monthlyTotals,
      seasonalityIndex,
      cohortRetention,
      peakHours: peakHoursFormatted,
    },
  };
}
