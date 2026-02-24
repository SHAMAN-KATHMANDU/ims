/**
 * Analytics: customers, promos, member cohort, customer insights.
 */

import {
  parseAnalyticsFilters,
  getSalesWhereForAnalytics,
} from "./analytics.filters";
import { withTenant } from "./analytics.helpers";
import * as repo from "./analytics.repository";

export async function getCustomersPromos(
  tenantId: string,
  role: string | undefined,
  userId: string | undefined,
  query: Record<string, unknown>,
) {
  const filters = parseAnalyticsFilters(query);
  const { where: salesWhere } = getSalesWhereForAnalytics(query, role, userId);
  const w = withTenant(salesWhere, tenantId);
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const dateTo = filters.dateTo
    ? (() => {
        const d = new Date(filters.dateTo);
        d.setHours(23, 59, 59, 999);
        return d;
      })()
    : null;

  const data = await repo.getCustomersPromosData(tenantId, w, dateFrom, dateTo);
  const memberIdsWithSales = new Set(
    data.membersWithSales.map((m) => m.memberId).filter(Boolean) as string[],
  );
  const repeatCount = data.membersWithSales.filter((m) => m._count > 1).length;
  const repeatPercent =
    memberIdsWithSales.size > 0
      ? (repeatCount / memberIdsWithSales.size) * 100
      : 0;

  const productPerf = data.productPerformanceRaw.map((p) => {
    const v = data.variations.find((x) => x.id === p.variationId);
    const cost = v ? Number(v.product.costPrice ?? 0) : 0;
    const revenue = Number(p._sum.lineTotal ?? 0);
    const qty = Number(p._sum.quantity ?? 0) || p._count;
    const margin = revenue - qty * cost;
    return {
      productId: v?.product.id ?? p.variationId,
      productName: v?.product.name ?? p.variationId,
      revenue,
      quantity: qty,
      margin,
    };
  });

  return {
    data: {
      memberKpis: {
        totalMembers: data.memberCount,
        newInPeriod: data.newMembersInPeriod,
        repeatPercent,
      },
      cohort: [],
      productPerformance: productPerf,
      promoEffectiveness: {
        promos: data.promoCodes.map((c) => ({
          code: c.code,
          usageCount: c.usageCount,
          value: Number(c.value),
        })),
        totalUsageCount: data.promoCodes.reduce((s, c) => s + c.usageCount, 0),
      },
    },
  };
}

export async function getMemberCohort(
  tenantId: string,
  role: string | undefined,
  userId: string | undefined,
  query: Record<string, unknown>,
) {
  const { where } = getSalesWhereForAnalytics(query, role, userId);
  const w = withTenant(where, tenantId);
  const byMember = await repo.getMemberCohortData(w);
  let newCount = 0;
  let repeatCount = 0;
  let newRevenue = 0;
  let repeatRevenue = 0;
  for (const row of byMember) {
    const count = row._count;
    const revenue = Number(row._sum.total ?? 0);
    if (count === 1) {
      newCount += 1;
      newRevenue += revenue;
    } else {
      repeatCount += 1;
      repeatRevenue += revenue;
    }
  }
  return {
    data: {
      newCount,
      repeatCount,
      newRevenue,
      repeatRevenue,
    },
  };
}

export async function getCustomerInsights(
  tenantId: string,
  role: string | undefined,
  userId: string | undefined,
  query: Record<string, unknown>,
) {
  const { filters, where } = getSalesWhereForAnalytics(query, role, userId);
  const w = withTenant(where, tenantId);
  const { membersWithSales, allMembers } = await repo.getCustomerInsightsData(
    tenantId,
    w,
  );
  const now = new Date();
  const clvValues = membersWithSales
    .map((m) => Number(m.totalSales ?? 0))
    .filter((v) => v > 0);
  const avgClv =
    clvValues.length > 0
      ? Math.round(clvValues.reduce((a, b) => a + b, 0) / clvValues.length)
      : 0;
  const clvBuckets = [
    { range: "0-1K", min: 0, max: 1000, count: 0 },
    { range: "1K-5K", min: 1000, max: 5000, count: 0 },
    { range: "5K-10K", min: 5000, max: 10000, count: 0 },
    { range: "10K-25K", min: 10000, max: 25000, count: 0 },
    { range: "25K-50K", min: 25000, max: 50000, count: 0 },
    { range: "50K+", min: 50000, max: Infinity, count: 0 },
  ];
  for (const v of clvValues) {
    const bucket = clvBuckets.find((b) => v >= b.min && v < b.max);
    if (bucket) bucket.count += 1;
  }
  const rfmData = membersWithSales
    .filter((m) => m.sales.length > 0)
    .map((m) => {
      const lastSale = m.sales[m.sales.length - 1];
      const recencyDays = Math.floor(
        (now.getTime() - lastSale.createdAt.getTime()) / (24 * 60 * 60 * 1000),
      );
      const frequency = m.sales.length;
      const monetary = m.sales.reduce((s, sale) => s + Number(sale.total), 0);
      return { memberId: m.id, recencyDays, frequency, monetary };
    });
  const scoreQuintile = (
    arr: number[],
    val: number,
    inverse = false,
  ): number => {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = sorted.findIndex((v) => v >= val);
    const pct = idx >= 0 ? idx / sorted.length : 1;
    const score = Math.min(5, Math.max(1, Math.ceil(pct * 5)));
    return inverse ? 6 - score : score;
  };
  const recencyArr = rfmData.map((r) => r.recencyDays);
  const freqArr = rfmData.map((r) => r.frequency);
  const monArr = rfmData.map((r) => r.monetary);
  const rfmSegments: Record<string, { count: number; revenue: number }> = {};
  for (const r of rfmData) {
    const rScore = scoreQuintile(recencyArr, r.recencyDays, true);
    const fScore = scoreQuintile(freqArr, r.frequency);
    const mScore = scoreQuintile(monArr, r.monetary);
    let segment: string;
    const avg = (rScore + fScore + mScore) / 3;
    if (rScore >= 4 && fScore >= 4) segment = "Champions";
    else if (rScore >= 3 && fScore >= 3) segment = "Loyal";
    else if (rScore >= 4 && fScore <= 2) segment = "New Customers";
    else if (rScore <= 2 && fScore >= 3) segment = "At Risk";
    else if (rScore <= 2 && fScore <= 2) segment = "Lost";
    else if (avg >= 3.5) segment = "Potential Loyalists";
    else segment = "Need Attention";
    if (!rfmSegments[segment]) rfmSegments[segment] = { count: 0, revenue: 0 };
    rfmSegments[segment].count += 1;
    rfmSegments[segment].revenue += r.monetary;
  }
  const frequencies: number[] = [];
  for (const m of membersWithSales) {
    if (m.sales.length < 2) continue;
    for (let i = 1; i < m.sales.length; i++) {
      frequencies.push(
        (m.sales[i].createdAt.getTime() - m.sales[i - 1].createdAt.getTime()) /
          (24 * 60 * 60 * 1000),
      );
    }
  }
  const avgOrderFrequencyDays =
    frequencies.length > 0
      ? Math.round(frequencies.reduce((a, b) => a + b, 0) / frequencies.length)
      : 0;
  const memberGrowthMap: Record<string, number> = {};
  for (const m of allMembers) {
    const key = m.createdAt.toISOString().slice(0, 7);
    memberGrowthMap[key] = (memberGrowthMap[key] ?? 0) + 1;
  }
  const memberGrowth = Object.entries(memberGrowthMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
  const dateTo = filters.dateTo
    ? (() => {
        const d = new Date(filters.dateTo);
        d.setHours(23, 59, 59, 999);
        return d;
      })()
    : undefined;
  let retentionRate = 0;
  let churnRate = 0;
  if (dateFrom && dateTo) {
    const periodMs = dateTo.getTime() - dateFrom.getTime();
    const prevStart = new Date(dateFrom.getTime() - periodMs);
    const prevEnd = new Date(dateFrom.getTime() - 1);
    const prevPeriodMembers = new Set(
      membersWithSales
        .filter((m) =>
          m.sales.some(
            (s) => s.createdAt >= prevStart && s.createdAt <= prevEnd,
          ),
        )
        .map((m) => m.id),
    );
    const currentPeriodMembers = new Set(
      membersWithSales
        .filter((m) =>
          m.sales.some((s) => s.createdAt >= dateFrom && s.createdAt <= dateTo),
        )
        .map((m) => m.id),
    );
    const retained = [...prevPeriodMembers].filter((id) =>
      currentPeriodMembers.has(id),
    ).length;
    retentionRate =
      prevPeriodMembers.size > 0
        ? +((retained / prevPeriodMembers.size) * 100).toFixed(1)
        : 0;
    churnRate = +(100 - retentionRate).toFixed(1);
  }
  const newVsReturningMap: Record<
    string,
    { newRevenue: number; returningRevenue: number }
  > = {};
  const memberFirstSale: Record<string, string> = {};
  for (const m of membersWithSales) {
    if (m.sales.length > 0)
      memberFirstSale[m.id] = m.sales[0].createdAt.toISOString().slice(0, 7);
  }
  for (const m of membersWithSales) {
    for (const sale of m.sales) {
      const monthKey = sale.createdAt.toISOString().slice(0, 7);
      if (!newVsReturningMap[monthKey])
        newVsReturningMap[monthKey] = { newRevenue: 0, returningRevenue: 0 };
      if (memberFirstSale[m.id] === monthKey)
        newVsReturningMap[monthKey].newRevenue += Number(sale.total);
      else newVsReturningMap[monthKey].returningRevenue += Number(sale.total);
    }
  }
  const newVsReturningTimeSeries = Object.entries(newVsReturningMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({ month, ...v }));
  return {
    data: {
      clvDistribution: clvBuckets.map((b) => ({
        range: b.range,
        count: b.count,
      })),
      avgClv,
      retentionRate,
      churnRate,
      rfmSegments: Object.entries(rfmSegments).map(([segment, v]) => ({
        segment,
        ...v,
      })),
      avgOrderFrequencyDays,
      memberGrowth,
      newVsReturningTimeSeries,
    },
  };
}
