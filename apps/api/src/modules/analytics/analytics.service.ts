/**
 * Analytics service - business logic and orchestration.
 * Calls repository with proper where/params, performs all data transformations.
 */

import type { Prisma } from "@prisma/client";
import {
  parseAnalyticsFilters,
  getSalesWhereForAnalytics,
} from "./analytics.filters";
import analyticsRepository from "./analytics.repository";

type LocationInventoryWhereInput = Prisma.LocationInventoryWhereInput;

function saleWhereWithTenant<T extends Record<string, unknown>>(
  where: T,
  tenantId: string | null,
): T & { tenantId?: string } {
  if (!tenantId) return where as T & { tenantId?: string };
  return { ...where, tenantId };
}

function locationInventoryWhereWithTenant(
  existingWhere: Record<string, unknown>,
  tenantId: string | null,
): LocationInventoryWhereInput {
  if (!tenantId) return existingWhere as LocationInventoryWhereInput;
  return {
    ...existingWhere,
    location: {
      ...((existingWhere.location as Record<string, unknown>) ?? {}),
      tenantId,
    },
  } as LocationInventoryWhereInput;
}

function monthDifference(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export class AnalyticsService {
  async getOverview(_tenantId: string | null) {
    const data = await analyticsRepository.getOverviewData();
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
    };
  }

  async getSalesRevenue(
    query: Record<string, unknown>,
    role: string | undefined,
    currentUserId: string | undefined,
    tenantId: string | null,
  ) {
    const { where } = getSalesWhereForAnalytics(query, role, currentUserId);
    const saleWhereForChildren = saleWhereWithTenant(where, tenantId);

    const raw = await analyticsRepository.getSalesRevenueData(
      saleWhereForChildren,
      saleWhereForChildren,
    );

    const locationMap = Object.fromEntries(
      raw.locations.map((l) => [l.id, l.name]),
    );
    const userMap = Object.fromEntries(
      raw.users.map((u) => [u.id, u.username]),
    );

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
      if (!dailyMap[d])
        dailyMap[d] = { date: d, gross: 0, net: 0, discount: 0 };
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

    const userPerformance = raw.userPerformanceRaw.map((u) => ({
      userId: u.createdById,
      username: userMap[u.createdById] ?? u.createdById,
      revenue: Number(u._sum.total ?? 0),
      salesCount: u._count,
      avgDiscount: u._count > 0 ? Number(u._sum.discount ?? 0) / u._count : 0,
    }));

    return {
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
    };
  }

  async getInventoryOps(
    query: Record<string, unknown>,
    tenantId: string | null,
  ) {
    const filters = parseAnalyticsFilters(query);
    const invWhere: Record<string, unknown> = {};
    if (filters.locationIds?.length) {
      invWhere.locationId = { in: filters.locationIds };
    }
    if (filters.categoryId || filters.vendorId) {
      invWhere.variation = {
        product: {
          ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
          ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
        },
      };
    }
    const resolvedWhere = locationInventoryWhereWithTenant(invWhere, tenantId);

    const { inventoryItems, transferCounts, completedTransfers } =
      await analyticsRepository.getInventoryOpsData(resolvedWhere);

    let totalStockValueCost = 0;
    let totalStockValueMrp = 0;
    const variationTotal: Record<string, number> = {};
    const categoryLocationValue: Record<string, Record<string, number>> = {};
    const productQuantity: Record<string, number> = {};
    const aging0_30: number[] = [];
    const aging31_60: number[] = [];
    const aging61_90: number[] = [];
    const aging90Plus: number[] = [];
    const now = new Date();
    const LOW_STOCK_THRESHOLD = 5;

    for (const inv of inventoryItems) {
      const qty = inv.quantity;
      const cost = Number(inv.variation.product.costPrice ?? 0);
      const mrp = Number(inv.variation.product.mrp ?? 0);
      totalStockValueCost += qty * cost;
      totalStockValueMrp += qty * mrp;
      const vid = inv.variation.id;
      variationTotal[vid] = (variationTotal[vid] ?? 0) + qty;

      const catName = inv.variation.product.category?.name ?? "Other";
      if (!categoryLocationValue[catName]) {
        categoryLocationValue[catName] = {};
      }
      categoryLocationValue[catName][inv.location.name] =
        (categoryLocationValue[catName][inv.location.name] ?? 0) + qty * mrp;

      const productId = inv.variation.product.id;
      productQuantity[productId] = (productQuantity[productId] ?? 0) + qty;

      const value = qty * mrp;
      const created = inv.createdAt.getTime();
      const days = (now.getTime() - created) / (24 * 60 * 60 * 1000);
      if (days <= 30) aging0_30.push(value);
      else if (days <= 60) aging31_60.push(value);
      else if (days <= 90) aging61_90.push(value);
      else aging90Plus.push(value);
    }

    let lowStockCount = 0;
    let outOfStockCount = 0;
    for (const total of Object.values(variationTotal)) {
      const t = Number(total);
      if (t === 0) outOfStockCount += 1;
      if (t < LOW_STOCK_THRESHOLD) lowStockCount += 1;
    }

    const velocityQuantity = Object.entries(productQuantity).map(
      ([productId, quantity]) => ({
        velocity: 0,
        quantity,
        name: productId,
      }),
    );

    const heatmapRows = Object.entries(categoryLocationValue).map(
      ([category, locs]) => ({
        category,
        ...locs,
        total: Object.values(locs).reduce((a, b) => a + b, 0),
      }),
    );

    const funnel = {
      PENDING: transferCounts.find((t) => t.status === "PENDING")?._count ?? 0,
      APPROVED:
        transferCounts.find((t) => t.status === "APPROVED")?._count ?? 0,
      IN_TRANSIT:
        transferCounts.find((t) => t.status === "IN_TRANSIT")?._count ?? 0,
      COMPLETED:
        transferCounts.find((t) => t.status === "COMPLETED")?._count ?? 0,
    };

    let avgCompletionMs = 0;
    if (completedTransfers.length > 0) {
      const totalMs = completedTransfers.reduce(
        (sum, t) => sum + (t.completedAt!.getTime() - t.createdAt.getTime()),
        0,
      );
      avgCompletionMs = totalMs / completedTransfers.length;
    }

    const agingBuckets = {
      "0-30": aging0_30.reduce((a, b) => a + b, 0),
      "31-60": aging31_60.reduce((a, b) => a + b, 0),
      "61-90": aging61_90.reduce((a, b) => a + b, 0),
      "90+": aging90Plus.reduce((a, b) => a + b, 0),
    };

    return {
      kpis: {
        totalStockValueCost,
        totalStockValueMrp,
        lowStockCount,
        outOfStockCount,
        deadStockValue: 0,
      },
      healthQuadrant: velocityQuantity.slice(0, 100),
      heatmap: heatmapRows,
      aging: agingBuckets,
      transferFunnel: funnel,
      avgTransferCompletionDays: avgCompletionMs / (24 * 60 * 60 * 1000),
    };
  }

  async getCustomersPromos(
    query: Record<string, unknown>,
    role: string | undefined,
    currentUserId: string | undefined,
    tenantId: string | null,
  ) {
    const filters = parseAnalyticsFilters(query);
    const { where: salesWhere } = getSalesWhereForAnalytics(
      query,
      role,
      currentUserId,
    );
    const saleWhereForChildren = saleWhereWithTenant(salesWhere, tenantId);

    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const dateTo = filters.dateTo
      ? (() => {
          const d = new Date(filters.dateTo);
          d.setHours(23, 59, 59, 999);
          return d;
        })()
      : null;

    const raw = await analyticsRepository.getCustomersPromosData(
      saleWhereForChildren,
      saleWhereForChildren,
      dateFrom,
      dateTo,
    );

    const memberIdsWithSales = new Set(
      raw.membersWithSales.map((m) => m.memberId).filter(Boolean) as string[],
    );
    const repeatCount = raw.membersWithSales.filter((m) => m._count > 1).length;
    const repeatPercent =
      memberIdsWithSales.size > 0
        ? (repeatCount / memberIdsWithSales.size) * 100
        : 0;

    const productPerf = raw.productPerformanceRaw.map((p) => {
      const v = raw.variations.find((x) => x.id === p.variationId);
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
      memberKpis: {
        totalMembers: raw.memberCount,
        newInPeriod: raw.newMembersInPeriod,
        repeatPercent,
      },
      cohort: [],
      productPerformance: productPerf,
      promoEffectiveness: {
        promos: raw.promoCodes.map((c) => ({
          code: c.code,
          usageCount: c.usageCount,
          value: Number(c.value),
        })),
        totalUsageCount: raw.promoCodes.reduce((s, c) => s + c.usageCount, 0),
      },
    };
  }

  async getDiscountAnalytics(
    query: Record<string, unknown>,
    role: string | undefined,
    currentUserId: string | undefined,
    tenantId: string | null,
  ) {
    const { where } = getSalesWhereForAnalytics(query, role, currentUserId);
    const saleWhereForChildren = saleWhereWithTenant(where, tenantId);
    const raw =
      await analyticsRepository.getDiscountAnalyticsData(saleWhereForChildren);

    const dailyMap: Record<string, number> = {};
    for (const s of raw.salesForTimeSeries) {
      const d = s.createdAt.toISOString().slice(0, 10);
      dailyMap[d] = (dailyMap[d] ?? 0) + Number(s.discount);
    }
    const discountOverTime = Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, discount]) => ({ date, discount }));

    const userMap = Object.fromEntries(
      raw.users.map((u) => [u.id, u.username]),
    );
    const locationMap = Object.fromEntries(
      raw.locations.map((l) => [l.id, l.name]),
    );

    return {
      discountOverTime,
      byUser: raw.byUser.map((u) => ({
        userId: u.createdById,
        username: userMap[u.createdById] ?? u.createdById,
        discount: Number(u._sum.discount ?? 0),
      })),
      byLocation: raw.byLocation.map((l) => ({
        locationId: l.locationId,
        locationName: locationMap[l.locationId] ?? l.locationId,
        discount: Number(l._sum.discount ?? 0),
      })),
    };
  }

  async getPaymentTrends(
    query: Record<string, unknown>,
    role: string | undefined,
    currentUserId: string | undefined,
    tenantId: string | null,
  ) {
    const { where } = getSalesWhereForAnalytics(query, role, currentUserId);
    const saleWhereForChildren = saleWhereWithTenant(where, tenantId);

    const payments =
      await analyticsRepository.getPaymentTrendsData(saleWhereForChildren);

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

    return { timeSeries };
  }

  async getLocationComparison(
    query: Record<string, unknown>,
    role: string | undefined,
    currentUserId: string | undefined,
    tenantId: string | null,
  ) {
    const { where } = getSalesWhereForAnalytics(query, role, currentUserId);
    const saleWhereForChildren = saleWhereWithTenant(where, tenantId);
    const { byLocation, locations } =
      await analyticsRepository.getLocationComparisonData(saleWhereForChildren);

    const locationMap = Object.fromEntries(
      locations.map((l) => [l.id, l.name]),
    );

    return byLocation.map((l) => ({
      locationId: l.locationId,
      locationName: locationMap[l.locationId] ?? l.locationId,
      revenue: Number(l._sum.total ?? 0),
      salesCount: l._count,
      discount: Number(l._sum.discount ?? 0),
    }));
  }

  async getSalesExtended(
    query: Record<string, unknown>,
    role: string | undefined,
    currentUserId: string | undefined,
    tenantId: string | null,
  ) {
    const { where } = getSalesWhereForAnalytics(query, role, currentUserId);
    const saleWhereForChildren = saleWhereWithTenant(where, tenantId);
    const { salesWithItems, memberSalesAgg } =
      await analyticsRepository.getSalesExtendedData(saleWhereForChildren);

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const monthlyMap: Record<
      string,
      { gross: number; net: number; discount: number; count: number }
    > = {};
    const dayOfWeek = Array.from({ length: 7 }, () => ({
      revenue: 0,
      count: 0,
    }));
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

      const dow = d.getDay();
      dayOfWeek[dow].revenue += net;
      dayOfWeek[dow].count += 1;

      const hour = d.getHours();
      hourOfDay[hour].revenue += net;
      hourOfDay[hour].count += 1;

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
      monthlyAggregates,
      growthRates,
      basketMetrics: { avgBasketSize, totalItems, totalSales: salesCount },
      dayOfWeek: dayOfWeek.map((d, i) => ({ day: dayNames[i], ...d })),
      hourOfDay: hourOfDay.map((h, i) => ({ hour: i, ...h })),
      grossProfit,
      grossMargin,
      revenuePerMember,
      discountRatio,
    };
  }

  async getProductInsights(
    query: Record<string, unknown>,
    role: string | undefined,
    currentUserId: string | undefined,
    tenantId: string | null,
  ) {
    const { where } = getSalesWhereForAnalytics(query, role, currentUserId);
    const saleWhereForChildren = saleWhereWithTenant(where, tenantId);
    const invWhere = locationInventoryWhereWithTenant({}, tenantId);

    const { saleItemsRaw, inventoryItems } =
      await analyticsRepository.getProductInsightsData(
        saleWhereForChildren,
        invWhere,
      );

    const productMap: Record<
      string,
      {
        name: string;
        revenue: number;
        quantity: number;
        cost: number;
        categoryId: string;
        categoryName: string;
      }
    > = {};
    for (const item of saleItemsRaw) {
      const pid = item.variation.product.id;
      if (!productMap[pid]) {
        productMap[pid] = {
          name: item.variation.product.name,
          revenue: 0,
          quantity: 0,
          cost: 0,
          categoryId: item.variation.product.categoryId,
          categoryName: item.variation.product.category?.name ?? "Other",
        };
      }
      productMap[pid].revenue += Number(item.lineTotal);
      productMap[pid].quantity += item.quantity;
      productMap[pid].cost +=
        item.quantity * Number(item.variation.product.costPrice ?? 0);
    }

    const products = Object.entries(productMap)
      .map(([id, p]) => ({ productId: id, ...p, margin: p.revenue - p.cost }))
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
    let cumulative = 0;
    const abcClassification = products.map((p) => {
      cumulative += p.revenue;
      const cumulativePct =
        totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
      const grade = cumulativePct <= 80 ? "A" : cumulativePct <= 95 ? "B" : "C";
      return { ...p, cumulativePct: +cumulativePct.toFixed(1), grade };
    });

    const stockByVariation: Record<string, number> = {};
    for (const inv of inventoryItems) {
      stockByVariation[inv.variationId] =
        (stockByVariation[inv.variationId] ?? 0) + inv.quantity;
    }
    const soldByProduct: Record<string, number> = {};
    const variationToProduct: Record<string, string> = {};
    for (const item of saleItemsRaw) {
      variationToProduct[item.variationId] = item.variation.product.id;
      soldByProduct[item.variation.product.id] =
        (soldByProduct[item.variation.product.id] ?? 0) + item.quantity;
    }
    const stockByProduct: Record<string, number> = {};
    for (const [vid, qty] of Object.entries(stockByVariation)) {
      const pid = variationToProduct[vid];
      if (pid) stockByProduct[pid] = (stockByProduct[pid] ?? 0) + qty;
    }
    const sellThroughRates = Object.entries(soldByProduct)
      .map(([pid, sold]) => {
        const stock = stockByProduct[pid] ?? 0;
        const rate =
          sold + stock > 0 ? +((sold / (sold + stock)) * 100).toFixed(1) : 0;
        return {
          productId: pid,
          productName: productMap[pid]?.name ?? pid,
          unitsSold: sold,
          currentStock: stock,
          sellThroughRate: rate,
        };
      })
      .sort((a, b) => b.sellThroughRate - a.sellThroughRate);

    const salePairs: Record<string, number> = {};
    const saleItemsGrouped: Record<string, string[]> = {};
    for (const item of saleItemsRaw) {
      const pid = item.variation.product.id;
      if (!saleItemsGrouped[item.saleId]) saleItemsGrouped[item.saleId] = [];
      if (!saleItemsGrouped[item.saleId].includes(pid))
        saleItemsGrouped[item.saleId].push(pid);
    }
    for (const prods of Object.values(saleItemsGrouped)) {
      for (let i = 0; i < prods.length; i++) {
        for (let j = i + 1; j < prods.length; j++) {
          const key = [prods[i], prods[j]].sort().join("|");
          salePairs[key] = (salePairs[key] ?? 0) + 1;
        }
      }
    }
    const coPurchasePairs = Object.entries(salePairs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([key, count]) => {
        const [p1, p2] = key.split("|");
        return {
          product1: { id: p1, name: productMap[p1]?.name ?? p1 },
          product2: { id: p2, name: productMap[p2]?.name ?? p2 },
          frequency: count,
        };
      });

    const catMap: Record<
      string,
      { revenue: number; cost: number; quantity: number }
    > = {};
    for (const p of Object.values(productMap)) {
      if (!catMap[p.categoryName])
        catMap[p.categoryName] = { revenue: 0, cost: 0, quantity: 0 };
      catMap[p.categoryName].revenue += p.revenue;
      catMap[p.categoryName].cost += p.cost;
      catMap[p.categoryName].quantity += p.quantity;
    }
    const revenueByCategory = Object.entries(catMap)
      .map(([name, v]) => ({
        category: name,
        ...v,
        margin: v.revenue - v.cost,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      abcClassification,
      sellThroughRates,
      coPurchasePairs,
      revenueByCategory,
    };
  }

  async getInventoryExtended(
    query: Record<string, unknown>,
    role: string | undefined,
    currentUserId: string | undefined,
    tenantId: string | null,
  ) {
    const { filters, where } = getSalesWhereForAnalytics(
      query,
      role,
      currentUserId,
    );
    const saleWhereForChildren = saleWhereWithTenant(where, tenantId);
    const invWhere = locationInventoryWhereWithTenant({}, tenantId);

    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
    const dateTo = filters.dateTo
      ? (() => {
          const d = new Date(filters.dateTo!);
          d.setHours(23, 59, 59, 999);
          return d;
        })()
      : undefined;

    const { inventoryItems, saleItems, locations } =
      await analyticsRepository.getInventoryExtendedData(
        invWhere,
        saleWhereForChildren,
      );

    const now = new Date();
    const start = dateFrom ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const end = dateTo ?? now;
    const daysInPeriod = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
    );

    const stockByProduct: Record<
      string,
      { qty: number; costValue: number; name: string }
    > = {};
    for (const inv of inventoryItems) {
      const pid = inv.variation.product.id;
      const cost = Number(inv.variation.product.costPrice ?? 0);
      if (!stockByProduct[pid])
        stockByProduct[pid] = {
          qty: 0,
          costValue: 0,
          name: inv.variation.product.name,
        };
      stockByProduct[pid].qty += inv.quantity;
      stockByProduct[pid].costValue += inv.quantity * cost;
    }

    const soldByProduct: Record<
      string,
      { qty: number; cogs: number; revenue: number }
    > = {};
    for (const item of saleItems) {
      const pid = item.variation.product.id;
      if (!soldByProduct[pid])
        soldByProduct[pid] = { qty: 0, cogs: 0, revenue: 0 };
      soldByProduct[pid].qty += item.quantity;
      soldByProduct[pid].cogs +=
        item.quantity * Number(item.variation.product.costPrice ?? 0);
      soldByProduct[pid].revenue += Number(item.lineTotal);
    }

    const totalCogs = Object.values(soldByProduct).reduce(
      (s, p) => s + p.cogs,
      0,
    );
    const totalInventoryCost = Object.values(stockByProduct).reduce(
      (s, p) => s + p.costValue,
      0,
    );
    const turnoverRatio =
      totalInventoryCost > 0 ? +(totalCogs / totalInventoryCost).toFixed(2) : 0;

    const totalSalesValue = Object.values(soldByProduct).reduce(
      (s, p) => s + p.revenue,
      0,
    );
    const stockToSalesRatio =
      totalSalesValue > 0
        ? +(totalInventoryCost / totalSalesValue).toFixed(2)
        : 0;

    const daysOnHand = Object.entries(stockByProduct)
      .map(([pid, stock]) => {
        const sold = soldByProduct[pid]?.qty ?? 0;
        const dailyRate = sold / daysInPeriod;
        const doh =
          dailyRate > 0
            ? Math.round(stock.qty / dailyRate)
            : stock.qty > 0
              ? 999
              : 0;
        return {
          productId: pid,
          productName: stock.name,
          currentStock: stock.qty,
          dailySalesRate: +dailyRate.toFixed(1),
          daysOnHand: doh,
        };
      })
      .filter((p) => p.currentStock > 0)
      .sort((a, b) => b.daysOnHand - a.daysOnHand)
      .slice(0, 20);

    const deadStock = Object.entries(stockByProduct)
      .filter(([pid, stock]) => stock.qty > 0 && !soldByProduct[pid])
      .map(([pid, stock]) => ({
        productId: pid,
        productName: stock.name,
        currentStock: stock.qty,
        stockValue: stock.costValue,
      }))
      .sort((a, b) => b.stockValue - a.stockValue);

    const soldByLocation: Record<string, number> = {};
    const stockByLocation: Record<string, number> = {};
    for (const item of saleItems) {
      const lid = (item.sale as { locationId: string }).locationId;
      soldByLocation[lid] = (soldByLocation[lid] ?? 0) + item.quantity;
    }
    for (const inv of inventoryItems) {
      stockByLocation[inv.location.id] =
        (stockByLocation[inv.location.id] ?? 0) + inv.quantity;
    }
    const locationMap = Object.fromEntries(
      locations.map((l) => [l.id, l.name]),
    );
    const sellThroughByLocation = Object.keys({
      ...soldByLocation,
      ...stockByLocation,
    }).map((lid) => {
      const sold = soldByLocation[lid] ?? 0;
      const stock = stockByLocation[lid] ?? 0;
      const rate =
        sold + stock > 0 ? +((sold / (sold + stock)) * 100).toFixed(1) : 0;
      return {
        locationId: lid,
        locationName: locationMap[lid] ?? lid,
        unitsSold: sold,
        currentStock: stock,
        sellThroughRate: rate,
      };
    });

    return {
      turnoverRatio,
      stockToSalesRatio,
      daysOnHand,
      deadStock,
      sellThroughByLocation,
    };
  }

  async getCustomerInsights(
    query: Record<string, unknown>,
    role: string | undefined,
    currentUserId: string | undefined,
    tenantId: string | null,
  ) {
    const { filters, where } = getSalesWhereForAnalytics(
      query,
      role,
      currentUserId,
    );
    const saleWhereForChildren = saleWhereWithTenant(where, tenantId);

    const { membersWithSales, allMembers } =
      await analyticsRepository.getCustomerInsightsData(saleWhereForChildren);

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
          (now.getTime() - lastSale.createdAt.getTime()) /
            (24 * 60 * 60 * 1000),
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

      if (!rfmSegments[segment])
        rfmSegments[segment] = { count: 0, revenue: 0 };
      rfmSegments[segment].count += 1;
      rfmSegments[segment].revenue += r.monetary;
    }

    const frequencies: number[] = [];
    for (const m of membersWithSales) {
      if (m.sales.length < 2) continue;
      for (let i = 1; i < m.sales.length; i++) {
        const diff =
          (m.sales[i].createdAt.getTime() -
            m.sales[i - 1].createdAt.getTime()) /
          (24 * 60 * 60 * 1000);
        frequencies.push(diff);
      }
    }
    const avgOrderFrequencyDays =
      frequencies.length > 0
        ? Math.round(
            frequencies.reduce((a, b) => a + b, 0) / frequencies.length,
          )
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
          const d = new Date(filters.dateTo!);
          d.setHours(23, 59, 59, 999);
          return d;
        })()
      : undefined;

    let retentionRate = 0;
    let churnRate = 0;
    let hasMeaningfulChurn = false;
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
            m.sales.some(
              (s) => s.createdAt >= dateFrom && s.createdAt <= dateTo,
            ),
          )
          .map((m) => m.id),
      );
      hasMeaningfulChurn = prevPeriodMembers.size > 0;
      const retained = [...prevPeriodMembers].filter((id) =>
        currentPeriodMembers.has(id),
      ).length;
      retentionRate =
        prevPeriodMembers.size > 0
          ? +((retained / prevPeriodMembers.size) * 100).toFixed(1)
          : 0;
      churnRate = hasMeaningfulChurn ? +(100 - retentionRate).toFixed(1) : 0;
    }

    const newVsReturningMap: Record<
      string,
      { newRevenue: number; returningRevenue: number }
    > = {};
    const memberFirstSale: Record<string, string> = {};
    for (const m of membersWithSales) {
      if (m.sales.length > 0) {
        memberFirstSale[m.id] = m.sales[0].createdAt.toISOString().slice(0, 7);
      }
    }
    for (const m of membersWithSales) {
      for (const sale of m.sales) {
        const monthKey = sale.createdAt.toISOString().slice(0, 7);
        if (!newVsReturningMap[monthKey])
          newVsReturningMap[monthKey] = {
            newRevenue: 0,
            returningRevenue: 0,
          };
        if (memberFirstSale[m.id] === monthKey) {
          newVsReturningMap[monthKey].newRevenue += Number(sale.total);
        } else {
          newVsReturningMap[monthKey].returningRevenue += Number(sale.total);
        }
      }
    }
    const newVsReturningTimeSeries = Object.entries(newVsReturningMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, v]) => ({ month, ...v }));

    return {
      clvDistribution: clvBuckets.map((b) => ({
        range: b.range,
        count: b.count,
      })),
      avgClv,
      retentionRate,
      churnRate,
      hasMeaningfulChurn,
      rfmSegments: Object.entries(rfmSegments).map(([segment, v]) => ({
        segment,
        ...v,
      })),
      avgOrderFrequencyDays,
      memberGrowth,
      newVsReturningTimeSeries,
    };
  }

  async getTrends(
    query: Record<string, unknown>,
    role: string | undefined,
    currentUserId: string | undefined,
    tenantId: string | null,
  ) {
    const { where } = getSalesWhereForAnalytics(query, role, currentUserId);
    const saleWhereForChildren = saleWhereWithTenant(where, tenantId);
    const { sales, membersWithSales } =
      await analyticsRepository.getTrendsData(saleWhereForChildren);

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
        ? monthlyTotals.reduce((s, m) => s + m.revenue, 0) /
          monthlyTotals.length
        : 0;
    const seasonalityIndex = monthlyTotals.map((m) => ({
      month: m.month,
      index:
        overallAvg > 0 ? +((m.revenue / overallAvg) * 100).toFixed(0) : 100,
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

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const peakHoursFormatted = peakHours.map((hours, dayIdx) => ({
      day: dayNames[dayIdx],
      hours: hours.map((revenue, hour) => ({
        hour,
        revenue: Math.round(revenue),
      })),
    }));

    return {
      monthlyTotals,
      seasonalityIndex,
      cohortRetention,
      peakHours: peakHoursFormatted,
    };
  }

  async getFinancial(
    query: Record<string, unknown>,
    role: string | undefined,
    currentUserId: string | undefined,
    tenantId: string | null,
  ) {
    const { where } = getSalesWhereForAnalytics(query, role, currentUserId);
    const saleWhereForChildren = saleWhereWithTenant(where, tenantId);

    const { saleItems, locations } =
      await analyticsRepository.getFinancialData(saleWhereForChildren);

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
      const cost =
        item.quantity * Number(item.variation.product.costPrice ?? 0);
      const lineRevenue = Number(item.lineTotal);
      const catName = item.variation.product.category?.name ?? "Other";
      const lid = (item.sale as { locationId: string }).locationId;

      if (!dailyMap[d])
        dailyMap[d] = { revenue: 0, cogs: 0, discount: 0, subtotal: 0 };
      dailyMap[d].cogs += cost;

      if (!categoryMap[catName]) categoryMap[catName] = { revenue: 0, cogs: 0 };
      categoryMap[catName].revenue += lineRevenue;
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
        total: number;
      };
      const saleId = sale.id;
      if (processedSaleIds.has(saleId)) continue;
      processedSaleIds.add(saleId);
      const d = sale.createdAt.toISOString().slice(0, 10);
      if (dailyMap[d]) {
        dailyMap[d].revenue += Number(sale.total);
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
      .map(([category, v]) => ({
        category,
        cogs: v.cogs,
        revenue: v.revenue,
      }))
      .sort((a, b) => b.cogs - a.cogs);

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
      grossProfitTimeSeries,
      cogsByCategory,
      cogsByLocation,
      marginByCategory,
    };
  }

  async getMemberCohort(
    query: Record<string, unknown>,
    role: string | undefined,
    currentUserId: string | undefined,
    tenantId: string | null,
  ) {
    const { where } = getSalesWhereForAnalytics(query, role, currentUserId);
    const saleWhereForChildren = saleWhereWithTenant(where, tenantId);
    const byMember =
      await analyticsRepository.getMemberCohortData(saleWhereForChildren);

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
      newCount,
      repeatCount,
      newRevenue,
      repeatRevenue,
    };
  }

  async exportAnalytics(
    query: Record<string, unknown>,
    exportType: string,
    format: string,
    role: string | undefined,
    currentUserId: string | undefined,
    tenantId: string | null,
  ): Promise<
    | { type: "buffer"; buffer: Buffer; contentType: string; filename: string }
    | { type: "csv"; csv: string; contentType: string; filename: string }
    | { type: "error"; message: string }
  > {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const timestamp = new Date().toISOString().split("T")[0];

    const { where, filters } = getSalesWhereForAnalytics(
      query,
      role,
      currentUserId,
    );
    const saleWhereForChildren = saleWhereWithTenant(where, tenantId);
    const invWhere = locationInventoryWhereWithTenant({}, tenantId);

    if (exportType === "sales-revenue" || exportType === "sales-extended") {
      const sales =
        await analyticsRepository.getSalesForExport(saleWhereForChildren);
      const ws = workbook.addWorksheet("Sales Revenue");
      ws.columns = [
        { header: "Date", key: "date", width: 12 },
        { header: "Sale Code", key: "saleCode", width: 16 },
        { header: "Type", key: "type", width: 10 },
        { header: "Location", key: "location", width: 18 },
        { header: "User", key: "user", width: 14 },
        { header: "Subtotal", key: "subtotal", width: 14 },
        { header: "Discount", key: "discount", width: 12 },
        { header: "Total", key: "total", width: 14 },
        { header: "Items", key: "items", width: 8 },
      ];
      ws.getRow(1).font = { bold: true };
      for (const s of sales) {
        ws.addRow({
          date: s.createdAt.toISOString().slice(0, 10),
          saleCode: s.saleCode,
          type: s.type,
          location: s.location.name,
          user: s.createdBy.username,
          subtotal: Number(s.subtotal),
          discount: Number(s.discount),
          total: Number(s.total),
          items: s.items.reduce((acc, i) => acc + i.quantity, 0),
        });
      }
    } else if (exportType === "inventory-ops") {
      const invItems =
        await analyticsRepository.getInventoryForExport(invWhere);
      const ws = workbook.addWorksheet("Inventory");
      ws.columns = [
        { header: "Product", key: "product", width: 24 },
        { header: "Category", key: "category", width: 16 },
        { header: "Location", key: "location", width: 16 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Cost Price", key: "costPrice", width: 12 },
        { header: "MRP", key: "mrp", width: 12 },
        { header: "Stock Value (Cost)", key: "stockValueCost", width: 16 },
        { header: "Stock Value (MRP)", key: "stockValueMrp", width: 16 },
      ];
      ws.getRow(1).font = { bold: true };
      for (const inv of invItems) {
        const cost = Number(inv.variation.product.costPrice ?? 0);
        const mrp = Number(inv.variation.product.mrp ?? 0);
        ws.addRow({
          product: inv.variation.product.name,
          category: inv.variation.product.category?.name ?? "",
          location: inv.location.name,
          quantity: inv.quantity,
          costPrice: cost,
          mrp,
          stockValueCost: inv.quantity * cost,
          stockValueMrp: inv.quantity * mrp,
        });
      }
    } else if (exportType === "customers-promos") {
      const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const dateTo = filters.dateTo
        ? (() => {
            const d = new Date(filters.dateTo);
            d.setHours(23, 59, 59, 999);
            return d;
          })()
        : null;
      const raw = await analyticsRepository.getCustomersPromosForExport(
        saleWhereForChildren,
        saleWhereForChildren,
        dateFrom,
        dateTo,
      );
      const repeatCount = raw.membersWithSales.filter(
        (m) => m._count > 1,
      ).length;
      const memberIdsSize = new Set(
        raw.membersWithSales.map((m) => m.memberId).filter(Boolean),
      ).size;
      const repeatPercent =
        memberIdsSize > 0 ? (repeatCount / memberIdsSize) * 100 : 0;
      const productPerf = raw.productPerformanceRaw.map((p) => {
        const v = raw.variations.find((x) => x.id === p.variationId);
        const cost = v ? Number(v.product.costPrice ?? 0) : 0;
        const revenue = Number(p._sum.lineTotal ?? 0);
        const qty = Number(p._sum.quantity ?? 0) || p._count;
        return {
          productName: v?.product.name ?? p.variationId,
          revenue,
          quantity: qty,
          margin: revenue - qty * cost,
        };
      });

      const summaryWs = workbook.addWorksheet("Summary");
      summaryWs.addRow(["Report", "Customers & Promotions"]);
      summaryWs.addRow(["Total Members", raw.memberCount]);
      summaryWs.addRow(["New in Period", raw.newMembersInPeriod]);
      summaryWs.addRow(["Repeat %", repeatPercent.toFixed(1) + "%"]);
      summaryWs.getRow(1).font = { bold: true };

      const perfWs = workbook.addWorksheet("Product Performance");
      perfWs.columns = [
        { header: "Product", key: "productName", width: 28 },
        { header: "Revenue", key: "revenue", width: 14 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Margin", key: "margin", width: 14 },
      ];
      perfWs.getRow(1).font = { bold: true };
      productPerf.forEach((r) => perfWs.addRow(r));

      const promoWs = workbook.addWorksheet("Promo Effectiveness");
      promoWs.columns = [
        { header: "Code", key: "code", width: 16 },
        { header: "Usage Count", key: "usageCount", width: 12 },
        { header: "Value", key: "value", width: 12 },
      ];
      promoWs.getRow(1).font = { bold: true };
      raw.promoCodes.forEach((c) =>
        promoWs.addRow({
          code: c.code,
          usageCount: c.usageCount,
          value: Number(c.value),
        }),
      );
    } else if (exportType === "trends") {
      const { sales, membersWithSales } =
        await analyticsRepository.getTrendsForExport(saleWhereForChildren);

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
          return {
            month,
            revenue: v.revenue,
            count: v.count,
            discount: v.discount,
            momGrowth,
          };
        });
      const overallAvg =
        monthlyTotals.length > 0
          ? monthlyTotals.reduce((s, m) => s + m.revenue, 0) /
            monthlyTotals.length
          : 0;
      const seasonalityIndex = monthlyTotals.map((m) => ({
        month: m.month,
        index:
          overallAvg > 0 ? +((m.revenue / overallAvg) * 100).toFixed(0) : 100,
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
        .map(([cohortMonth, sets]) => ({
          cohortMonth,
          size: sets[0]?.size ?? 0,
          retention: sets.map((s) =>
            sets[0].size > 0 ? +((s.size / sets[0].size) * 100).toFixed(0) : 0,
          ),
        }));

      const summaryWs = workbook.addWorksheet("Summary");
      summaryWs.addRow(["Report", "Trends & Patterns"]);
      summaryWs.addRow(["Months", monthlyTotals.length]);
      summaryWs.getRow(1).font = { bold: true };

      const monthlyWs = workbook.addWorksheet("Monthly Totals");
      monthlyWs.columns = [
        { header: "Month", key: "month", width: 12 },
        { header: "Revenue", key: "revenue", width: 14 },
        { header: "Count", key: "count", width: 10 },
        { header: "Discount", key: "discount", width: 12 },
        { header: "MoM %", key: "momGrowth", width: 10 },
      ];
      monthlyWs.getRow(1).font = { bold: true };
      monthlyTotals.forEach((r) => monthlyWs.addRow(r));

      const seasonWs = workbook.addWorksheet("Seasonality");
      seasonWs.columns = [
        { header: "Month", key: "month", width: 12 },
        { header: "Index", key: "index", width: 10 },
      ];
      seasonWs.getRow(1).font = { bold: true };
      seasonalityIndex.forEach((r) => seasonWs.addRow(r));

      const cohortWs = workbook.addWorksheet("Cohort Retention");
      const maxRet = Math.max(
        0,
        ...cohortRetention.map((c) => c.retention.length),
      );
      cohortWs.addRow([
        "Cohort",
        "Size",
        ...Array.from({ length: maxRet }, (_, i) => `M+${i}`),
      ]);
      cohortWs.getRow(1).font = { bold: true };
      cohortRetention.forEach((c) =>
        cohortWs.addRow([c.cohortMonth, c.size, ...c.retention]),
      );

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const peakWs = workbook.addWorksheet("Peak Hours");
      peakWs.addRow([
        "Day",
        ...Array.from({ length: 24 }, (_, h) => h.toString()),
      ]);
      peakWs.getRow(1).font = { bold: true };
      peakHours.forEach((hours, dayIdx) =>
        peakWs.addRow([dayNames[dayIdx], ...hours]),
      );
    } else if (exportType === "financial") {
      const saleItems =
        await analyticsRepository.getFinancialForExport(saleWhereForChildren);
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
        const cost =
          item.quantity * Number(item.variation.product.costPrice ?? 0);
        const lineRevenue = Number(item.lineTotal);
        const catName = item.variation.product.category?.name ?? "Other";
        const lid = (item.sale as { locationId: string }).locationId;
        if (!dailyMap[d])
          dailyMap[d] = { revenue: 0, cogs: 0, discount: 0, subtotal: 0 };
        dailyMap[d].cogs += cost;
        if (!categoryMap[catName])
          categoryMap[catName] = { revenue: 0, cogs: 0 };
        categoryMap[catName].revenue += lineRevenue;
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
          total: number;
        };
        if (processedSaleIds.has(sale.id)) continue;
        processedSaleIds.add(sale.id);
        const d = sale.createdAt.toISOString().slice(0, 10);
        if (dailyMap[d]) {
          dailyMap[d].revenue += Number(sale.total);
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
        .map(([category, v]) => ({
          category,
          cogs: v.cogs,
          revenue: v.revenue,
        }))
        .sort((a, b) => b.cogs - a.cogs);
      const locationIds = Object.keys(locationCogsMap);
      const locations =
        locationIds.length > 0
          ? await analyticsRepository.findLocationsByIds(locationIds)
          : [];
      const locMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));
      const cogsByLocation = Object.entries(locationCogsMap)
        .map(([lid, cogs]) => ({ locationName: locMap[lid] ?? lid, cogs }))
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

      const summaryWs = workbook.addWorksheet("Summary");
      summaryWs.addRow(["Report", "Financial Analytics"]);
      summaryWs.addRow(["Days", grossProfitTimeSeries.length]);
      summaryWs.getRow(1).font = { bold: true };

      const gpWs = workbook.addWorksheet("Gross Profit Over Time");
      gpWs.columns = [
        { header: "Date", key: "date", width: 12 },
        { header: "Revenue", key: "revenue", width: 14 },
        { header: "COGS", key: "cogs", width: 14 },
        { header: "Gross Profit", key: "grossProfit", width: 14 },
        { header: "Discount %", key: "discountRatio", width: 12 },
      ];
      gpWs.getRow(1).font = { bold: true };
      grossProfitTimeSeries.forEach((r) => gpWs.addRow(r));

      const catWs = workbook.addWorksheet("COGS by Category");
      catWs.columns = [
        { header: "Category", key: "category", width: 20 },
        { header: "COGS", key: "cogs", width: 14 },
        { header: "Revenue", key: "revenue", width: 14 },
      ];
      catWs.getRow(1).font = { bold: true };
      cogsByCategory.forEach((r) => catWs.addRow(r));

      const locWs = workbook.addWorksheet("COGS by Location");
      locWs.columns = [
        { header: "Location", key: "locationName", width: 20 },
        { header: "COGS", key: "cogs", width: 14 },
      ];
      locWs.getRow(1).font = { bold: true };
      cogsByLocation.forEach((r) => locWs.addRow(r));

      const marginWs = workbook.addWorksheet("Margin by Category");
      marginWs.columns = [
        { header: "Category", key: "category", width: 20 },
        { header: "Revenue", key: "revenue", width: 14 },
        { header: "COGS", key: "cogs", width: 14 },
        { header: "Margin", key: "margin", width: 14 },
        { header: "Margin %", key: "marginPct", width: 10 },
      ];
      marginWs.getRow(1).font = { bold: true };
      marginByCategory.forEach((r) => marginWs.addRow(r));
    } else {
      return { type: "error", message: "Invalid export type" };
    }

    const ext = format === "excel" ? "xlsx" : "csv";
    const filename = `analytics_${exportType}_${timestamp}.${ext}`;

    if (format === "excel") {
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        type: "buffer",
        buffer: Buffer.from(buffer),
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename,
      };
    }

    const ws = workbook.worksheets[0];
    if (!ws) return { type: "error", message: "No data to export" };
    const rows: string[] = [];
    ws.eachRow((row) => {
      const vals = (row.values as (string | number | null)[])
        .slice(1)
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`);
      rows.push(vals.join(","));
    });
    return {
      type: "csv",
      csv: rows.join("\n"),
      contentType: "text/csv; charset=utf-8",
      filename,
    };
  }
}

export default new AnalyticsService();
