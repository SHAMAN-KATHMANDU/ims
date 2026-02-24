/**
 * Analytics: inventory ops and extended inventory reports.
 */

import type { Prisma } from "@prisma/client";
import { parseAnalyticsFilters } from "./analytics.filters";
import { getSalesWhereForAnalytics } from "./analytics.filters";
import { withTenant } from "./analytics.helpers";
import * as repo from "./analytics.repository";

export async function getInventoryOps(
  tenantId: string,
  query: Record<string, unknown>,
) {
  const filters = parseAnalyticsFilters(query);
  const invWhere: Prisma.LocationInventoryWhereInput = {};
  if (filters.locationIds?.length)
    invWhere.locationId = { in: filters.locationIds };
  if (filters.categoryId || filters.vendorId) {
    invWhere.variation = {
      product: {
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
      },
    };
  }

  const { inventoryItems, transferCounts, completedTransfers } =
    await repo.getInventoryOpsData(tenantId, invWhere);

  const LOW_STOCK_THRESHOLD = 5;
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

  for (const inv of inventoryItems) {
    const qty = inv.quantity;
    const cost = Number(inv.variation.product.costPrice ?? 0);
    const mrp = Number(inv.variation.product.mrp ?? 0);
    totalStockValueCost += qty * cost;
    totalStockValueMrp += qty * mrp;
    const vid = inv.variation.id;
    variationTotal[vid] = (variationTotal[vid] ?? 0) + qty;
    const catName = inv.variation.product.category?.name ?? "Other";
    if (!categoryLocationValue[catName]) categoryLocationValue[catName] = {};
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
    APPROVED: transferCounts.find((t) => t.status === "APPROVED")?._count ?? 0,
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
    data: {
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
    },
  };
}

export async function getInventoryExtended(
  tenantId: string,
  role: string | undefined,
  userId: string | undefined,
  query: Record<string, unknown>,
) {
  const { filters, where } = getSalesWhereForAnalytics(query, role, userId);
  const w = withTenant(where, tenantId);
  const { inventoryItems, saleItems, locations } =
    await repo.getInventoryExtendedData(w);
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
  const dateTo = filters.dateTo
    ? (() => {
        const d = new Date(filters.dateTo);
        d.setHours(23, 59, 59, 999);
        return d;
      })()
    : undefined;
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
  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));
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
    data: {
      turnoverRatio,
      stockToSalesRatio,
      daysOnHand,
      deadStock,
      sellThroughByLocation,
    },
  };
}
