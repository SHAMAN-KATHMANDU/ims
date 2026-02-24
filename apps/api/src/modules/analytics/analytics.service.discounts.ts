/**
 * Analytics: discount, payment trends, financial.
 */

import { getSalesWhereForAnalytics } from "./analytics.filters";
import { withTenant } from "./analytics.helpers";
import * as repo from "./analytics.repository";

export async function getDiscountAnalytics(
  tenantId: string,
  role: string | undefined,
  userId: string | undefined,
  query: Record<string, unknown>,
) {
  const { where } = getSalesWhereForAnalytics(query, role, userId);
  const w = withTenant(where, tenantId);
  const { salesForTimeSeries, byUser, byLocation, users, locations } =
    await repo.getDiscountData(w);

  const dailyMap: Record<string, number> = {};
  for (const s of salesForTimeSeries) {
    const d = s.createdAt.toISOString().slice(0, 10);
    dailyMap[d] = (dailyMap[d] ?? 0) + Number(s.discount);
  }
  const discountOverTime = Object.entries(dailyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, discount]) => ({ date, discount }));

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]));
  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));

  return {
    data: {
      discountOverTime,
      byUser: byUser.map((u) => ({
        userId: u.createdById,
        username: userMap[u.createdById] ?? u.createdById,
        discount: Number(u._sum.discount ?? 0),
      })),
      byLocation: byLocation.map((l) => ({
        locationId: l.locationId,
        locationName: locationMap[l.locationId] ?? l.locationId,
        discount: Number(l._sum.discount ?? 0),
      })),
    },
  };
}

export async function getPaymentTrends(
  tenantId: string,
  role: string | undefined,
  userId: string | undefined,
  query: Record<string, unknown>,
) {
  const { where } = getSalesWhereForAnalytics(query, role, userId);
  const w = withTenant(where, tenantId);
  const payments = await repo.getPaymentTrendsData(w);
  const byDate: Record<string, Record<string, number>> = {};
  for (const p of payments) {
    const d = (p.sale as { createdAt: Date }).createdAt
      .toISOString()
      .slice(0, 10);
    if (!byDate[d]) byDate[d] = {};
    const method = p.method;
    byDate[d][method] = (byDate[d][method] ?? 0) + Number(p.amount);
  }
  const timeSeries = Object.entries(byDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, methods]) => ({ date, ...methods }));
  return { data: { timeSeries } };
}

export async function getFinancial(
  tenantId: string,
  role: string | undefined,
  userId: string | undefined,
  query: Record<string, unknown>,
) {
  const { where } = getSalesWhereForAnalytics(query, role, userId);
  const w = withTenant(where, tenantId);
  const { saleItems } = await repo.getFinancialData(w);
  const dailyMap: Record<
    string,
    { revenue: number; cogs: number; discount: number; subtotal: number }
  > = {};
  const categoryMap: Record<string, { revenue: number; cogs: number }> = {};
  const locationCogsMap: Record<string, number> = {};
  for (const item of saleItems) {
    const d = (item.sale as { createdAt: Date }).createdAt
      .toISOString()
      .slice(0, 10);
    const cost = item.quantity * Number(item.variation.product.costPrice ?? 0);
    const revenue = Number(item.lineTotal);
    const catName = item.variation.product.category?.name ?? "Other";
    const lid = (item.sale as { locationId: string }).locationId;
    if (!dailyMap[d])
      dailyMap[d] = { revenue: 0, cogs: 0, discount: 0, subtotal: 0 };
    dailyMap[d].revenue += revenue;
    dailyMap[d].cogs += cost;
    if (!categoryMap[catName]) categoryMap[catName] = { revenue: 0, cogs: 0 };
    categoryMap[catName].revenue += revenue;
    categoryMap[catName].cogs += cost;
    locationCogsMap[lid] = (locationCogsMap[lid] ?? 0) + cost;
  }
  const processedSaleIds = new Set<string>();
  for (const item of saleItems) {
    const sale = item.sale as unknown as {
      id: string;
      createdAt: Date;
      discount: number;
      subtotal: number;
    };
    if (processedSaleIds.has(sale.id)) continue;
    processedSaleIds.add(sale.id);
    const d = sale.createdAt.toISOString().slice(0, 10);
    if (dailyMap[d]) {
      dailyMap[d].discount += Number(sale.discount);
      dailyMap[d].subtotal += Number(sale.subtotal);
    }
  }
  const grossProfitTimeSeries = Object.entries(dailyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      revenue: v.revenue,
      cogs: v.cogs,
      grossProfit: v.revenue - v.cogs,
      discountRatio:
        v.subtotal > 0 ? +((v.discount / v.subtotal) * 100).toFixed(1) : 0,
    }));
  const cogsByCategory = Object.entries(categoryMap)
    .map(([category, v]) => ({ category, cogs: v.cogs, revenue: v.revenue }))
    .sort((a, b) => b.cogs - a.cogs);
  const locationIds = Object.keys(locationCogsMap);
  const locations =
    locationIds.length > 0 ? await repo.findLocationsByIds(locationIds) : [];
  const locMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));
  const cogsByLocation = Object.entries(locationCogsMap)
    .map(([lid, cogs]) => ({
      locationId: lid,
      locationName: locMap[lid] ?? lid,
      cogs,
    }))
    .sort((a, b) => b.cogs - a.cogs);
  const marginByCategory = Object.entries(categoryMap)
    .map(([category, v]) => ({
      category,
      revenue: v.revenue,
      cogs: v.cogs,
      margin: v.revenue - v.cogs,
      marginPct:
        v.revenue > 0
          ? +(((v.revenue - v.cogs) / v.revenue) * 100).toFixed(1)
          : 0,
    }))
    .sort((a, b) => b.marginPct - a.marginPct);
  return {
    data: {
      grossProfitTimeSeries,
      cogsByCategory,
      cogsByLocation,
      marginByCategory,
    },
  };
}
