/**
 * Analytics: location comparison and product insights.
 */

import { getSalesWhereForAnalytics } from "./analytics.filters";
import { withTenant } from "./analytics.helpers";
import * as repo from "./analytics.repository";

export async function getLocationComparison(
  tenantId: string,
  role: string | undefined,
  userId: string | undefined,
  query: Record<string, unknown>,
) {
  const { where } = getSalesWhereForAnalytics(query, role, userId);
  const w = withTenant(where, tenantId);
  const { byLocation, locations } = await repo.getLocationComparisonData(w);
  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));
  return {
    data: byLocation.map((l) => ({
      locationId: l.locationId,
      locationName: locationMap[l.locationId] ?? l.locationId,
      revenue: Number(l._sum.total ?? 0),
      salesCount: l._count,
      discount: Number(l._sum.discount ?? 0),
    })),
  };
}

export async function getProductInsights(
  tenantId: string,
  role: string | undefined,
  userId: string | undefined,
  query: Record<string, unknown>,
) {
  const { where } = getSalesWhereForAnalytics(query, role, userId);
  const w = withTenant(where, tenantId);
  const { saleItemsRaw, inventoryItems } = await repo.getProductInsightsData(w);
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
    .map(([name, v]) => ({ category: name, ...v, margin: v.revenue - v.cost }))
    .sort((a, b) => b.revenue - a.revenue);
  return {
    data: {
      abcClassification,
      sellThroughRates,
      coPurchasePairs,
      revenueByCategory,
    },
  };
}
