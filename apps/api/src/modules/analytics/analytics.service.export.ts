/**
 * Analytics: export to Excel/CSV.
 */

import {
  parseAnalyticsFilters,
  getSalesWhereForAnalytics,
} from "./analytics.filters";
import { withTenant, monthDifference } from "./analytics.helpers";
import * as repo from "./analytics.repository";

export type ExportResult =
  | { type: "buffer"; buffer: Buffer; filename: string; contentType: string }
  | { type: "csv"; csv: string; filename: string; contentType: string };

export async function exportAnalytics(
  tenantId: string,
  role: string | undefined,
  userId: string | undefined,
  query: Record<string, unknown>,
): Promise<ExportResult> {
  const ExcelJS = (await import("exceljs")).default;
  const { type: exportType, format = "csv" } = query as {
    type:
      | "sales-revenue"
      | "sales-extended"
      | "inventory-ops"
      | "customers-promos"
      | "trends"
      | "financial";
    format?: "csv" | "excel";
  };
  const { where } = getSalesWhereForAnalytics(query, role, userId);
  const w = withTenant(where, tenantId);
  const timestamp = new Date().toISOString().split("T")[0];
  const workbook = new ExcelJS.Workbook();
  if (exportType === "sales-revenue" || exportType === "sales-extended") {
    const sales = await repo.getExportSalesData(w);
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
    const invItems = await repo.getExportInventoryData(tenantId);
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
    const filters = parseAnalyticsFilters(query);
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const dateTo = filters.dateTo
      ? (() => {
          const d = new Date(filters.dateTo);
          d.setHours(23, 59, 59, 999);
          return d;
        })()
      : null;
    const data = await repo.getCustomersPromosData(
      tenantId,
      w,
      dateFrom,
      dateTo,
    );
    const repeatCount = data.membersWithSales.filter(
      (m) => m._count > 1,
    ).length;
    const memberIdsSize = new Set(
      data.membersWithSales.map((m) => m.memberId).filter(Boolean),
    ).size;
    const repeatPercent =
      memberIdsSize > 0 ? (repeatCount / memberIdsSize) * 100 : 0;
    const productPerf = data.productPerformanceRaw.map((p) => {
      const v = data.variations.find((x) => x.id === p.variationId);
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
    summaryWs.addRow(["Total Members", data.memberCount]);
    summaryWs.addRow(["New in Period", data.newMembersInPeriod]);
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
    data.promoCodes.forEach((c) =>
      promoWs.addRow({
        code: c.code,
        usageCount: c.usageCount,
        value: Number(c.value),
      }),
    );
  } else if (exportType === "trends") {
    const { sales, membersWithSales } = await repo.getExportTrendsData(
      tenantId,
      w,
    );
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
        return {
          month,
          ...v,
          momGrowth:
            prev > 0 ? +(((v.revenue - prev) / prev) * 100).toFixed(1) : 0,
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
        const monthDiff = monthDifference(
          firstMonth,
          sale.createdAt.toISOString().slice(0, 7),
        );
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
        retention: sets.map((s, i) =>
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
    const peakWs = workbook.addWorksheet("Peak Hours");
    peakWs.addRow([
      "Day",
      ...Array.from({ length: 24 }, (_, h) => h.toString()),
    ]);
    peakWs.getRow(1).font = { bold: true };
    peakHours.forEach((hours, dayIdx) =>
      peakWs.addRow([
        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayIdx],
        ...hours,
      ]),
    );
  } else if (exportType === "financial") {
    const saleItems = await repo.getExportFinancialSaleItems(w);
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
    throw new Error("Invalid export type");
  }
  const ext = format === "excel" ? "xlsx" : "csv";
  const filename = `analytics_${exportType}_${timestamp}.${ext}`;
  if (format === "excel") {
    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
    return {
      type: "buffer",
      buffer,
      filename,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }
  const ws = workbook.worksheets[0];
  if (!ws) throw new Error("No data to export");
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
    filename,
    contentType: "text/csv; charset=utf-8",
  };
}
