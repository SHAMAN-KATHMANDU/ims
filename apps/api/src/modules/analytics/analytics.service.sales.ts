/**
 * Analytics: sales revenue and extended sales reports.
 */

import { getSalesWhereForAnalytics } from "./analytics.filters";
import { withTenant, dayNames } from "./analytics.helpers";
import * as repo from "./analytics.repository";

export async function getSalesRevenue(
  tenantId: string,
  role: string | undefined,
  userId: string | undefined,
  query: Record<string, unknown>,
) {
  const { where } = getSalesWhereForAnalytics(query, role, userId);
  const w = withTenant(where, tenantId);
  const raw = await repo.getSalesRevenueData(w);

  const totalRevenue = Number(raw.kpisAgg._sum.subtotal ?? 0);
  const netRevenue = Number(raw.kpisAgg._sum.total ?? 0);
  const totalDiscount = Number(raw.kpisAgg._sum.discount ?? 0);
  const salesCount = raw.kpisAgg._count;
  const avgOrderValue = salesCount > 0 ? netRevenue / salesCount : 0;

  const paymentBySaleId = Object.fromEntries(
    raw.paymentsBySaleId.map((p) => [p.saleId, Number(p._sum.amount ?? 0)]),
  );
  let outstandingCredit = 0;
  for (const sale of raw.creditSalesForOutstanding) {
    const paid = paymentBySaleId[sale.id] ?? 0;
    const balance = Number(sale.total) - paid;
    if (balance > 0) outstandingCredit += balance;
  }

  const dailyMap: Record<
    string,
    { date: string; gross: number; net: number; discount: number }
  > = {};
  for (const s of raw.salesForTimeSeries) {
    const d = s.createdAt.toISOString().slice(0, 10);
    if (!dailyMap[d]) dailyMap[d] = { date: d, gross: 0, net: 0, discount: 0 };
    dailyMap[d].gross += Number(s.subtotal);
    dailyMap[d].net += Number(s.total);
    dailyMap[d].discount += Number(s.discount);
  }
  const timeSeries = Object.values(dailyMap).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const creditIssuedByDate: Record<string, number> = {};
  for (const s of raw.creditSalesForAging) {
    const d = s.createdAt.toISOString().slice(0, 10);
    creditIssuedByDate[d] = (creditIssuedByDate[d] ?? 0) + Number(s.total);
  }
  const paymentSumByDate: Record<string, number> = {};
  for (const p of raw.paymentsForCreditByDate) {
    const d = p.createdAt.toISOString().slice(0, 10);
    paymentSumByDate[d] = (paymentSumByDate[d] ?? 0) + Number(p.amount);
  }
  const allCreditDates = new Set([
    ...Object.keys(creditIssuedByDate),
    ...Object.keys(paymentSumByDate),
  ]);
  const creditTimeSeries = [...allCreditDates].sort().map((date) => ({
    date,
    issued: creditIssuedByDate[date] ?? 0,
    paid: paymentSumByDate[date] ?? 0,
  }));

  const now = new Date();
  let aging0_7 = 0,
    aging8_30 = 0,
    aging30Plus = 0;
  for (const sale of raw.creditSalesForAging) {
    const paid = paymentBySaleId[sale.id] ?? 0;
    if (Number(sale.total) <= paid) continue;
    const days = Math.floor(
      (now.getTime() - sale.createdAt.getTime()) / (24 * 60 * 60 * 1000),
    );
    const balance = Number(sale.total) - paid;
    if (days <= 7) aging0_7 += balance;
    else if (days <= 30) aging8_30 += balance;
    else aging30Plus += balance;
  }

  const locationMap = Object.fromEntries(
    raw.locations.map((l) => [l.id, l.name]),
  );
  const compositionLocation = raw.compositionByLocation.map((c) => ({
    locationId: c.locationId,
    locationName: locationMap[c.locationId] ?? c.locationId,
    revenue: Number(c._sum.total ?? 0),
    count: c._count,
  }));
  const compositionPayment = raw.compositionByPayment.map((c) => ({
    method: c.method,
    revenue: Number(c._sum.amount ?? 0),
    count: c._count,
  }));
  const compositionType = raw.compositionByType.map((c) => ({
    type: c.type,
    revenue: Number(c._sum.total ?? 0),
    count: c._count,
  }));

  const userMap = Object.fromEntries(raw.users.map((u) => [u.id, u.username]));
  const userPerformance = raw.userPerformanceRaw.map((u) => ({
    userId: u.createdById,
    username: userMap[u.createdById] ?? u.createdById,
    revenue: Number(u._sum.total ?? 0),
    salesCount: u._count,
    avgDiscount: u._count > 0 ? Number(u._sum.discount ?? 0) / u._count : 0,
  }));

  return {
    data: {
      kpis: {
        totalRevenue,
        netRevenue,
        salesCount,
        avgOrderValue,
        totalDiscount,
        outstandingCredit,
      },
      timeSeries,
      composition: {
        byLocation: compositionLocation,
        byPaymentMethod: compositionPayment,
        bySaleType: compositionType,
      },
      credit: {
        timeSeries: creditTimeSeries,
        aging: { "0-7": aging0_7, "8-30": aging8_30, "30+": aging30Plus },
      },
      userPerformance,
    },
  };
}

export async function getSalesExtended(
  tenantId: string,
  role: string | undefined,
  userId: string | undefined,
  query: Record<string, unknown>,
) {
  const { where } = getSalesWhereForAnalytics(query, role, userId);
  const w = withTenant(where, tenantId);
  const { salesWithItems, memberSalesAgg } = await repo.getSalesExtendedData(w);
  const monthlyMap: Record<
    string,
    { gross: number; net: number; discount: number; count: number }
  > = {};
  const dayOfWeek = Array.from({ length: 7 }, () => ({ revenue: 0, count: 0 }));
  const hourOfDay = Array.from({ length: 24 }, () => ({
    revenue: 0,
    count: 0,
  }));
  let totalItems = 0;
  let totalCogs = 0;
  let totalRevenue = 0;
  for (const sale of salesWithItems) {
    const gross = Number(sale.subtotal);
    const net = Number(sale.total);
    const disc = Number(sale.discount);
    const d = sale.createdAt;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap[monthKey])
      monthlyMap[monthKey] = { gross: 0, net: 0, discount: 0, count: 0 };
    monthlyMap[monthKey].gross += gross;
    monthlyMap[monthKey].net += net;
    monthlyMap[monthKey].discount += disc;
    monthlyMap[monthKey].count += 1;
    dayOfWeek[d.getDay()].revenue += net;
    dayOfWeek[d.getDay()].count += 1;
    hourOfDay[d.getHours()].revenue += net;
    hourOfDay[d.getHours()].count += 1;
    totalRevenue += net;
    for (const item of sale.items) {
      totalItems += item.quantity;
      totalCogs +=
        item.quantity * Number(item.variation.product.costPrice ?? 0);
    }
  }
  const monthlyAggregates = Object.entries(monthlyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({ month, ...v }));
  const growthRates = monthlyAggregates.map((m, i) => {
    if (i === 0) return { month: m.month, growthPct: 0 };
    const prev = monthlyAggregates[i - 1].net;
    return {
      month: m.month,
      growthPct: prev > 0 ? +(((m.net - prev) / prev) * 100).toFixed(1) : 0,
    };
  });
  const salesCount = salesWithItems.length;
  const avgBasketSize =
    salesCount > 0 ? +(totalItems / salesCount).toFixed(1) : 0;
  const grossProfit = totalRevenue - totalCogs;
  const grossMargin =
    totalRevenue > 0 ? +((grossProfit / totalRevenue) * 100).toFixed(1) : 0;
  const discountRatio =
    totalRevenue > 0
      ? +(
          (salesWithItems.reduce((s, x) => s + Number(x.discount), 0) /
            salesWithItems.reduce((s, x) => s + Number(x.subtotal), 0)) *
          100
        ).toFixed(1)
      : 0;
  const distinctMembers = memberSalesAgg.length;
  const memberRevenue = memberSalesAgg.reduce(
    (s, m) => s + Number(m._sum.total ?? 0),
    0,
  );
  const revenuePerMember =
    distinctMembers > 0 ? Math.round(memberRevenue / distinctMembers) : 0;
  return {
    data: {
      monthlyAggregates,
      growthRates,
      basketMetrics: { avgBasketSize, totalItems, totalSales: salesCount },
      dayOfWeek: dayOfWeek.map((d, i) => ({ day: dayNames[i], ...d })),
      hourOfDay: hourOfDay.map((h, i) => ({ hour: i, ...h })),
      grossProfit,
      grossMargin,
      revenuePerMember,
      discountRatio,
    },
  };
}
