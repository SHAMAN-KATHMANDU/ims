/**
 * Sales Analytics Queries
 *
 * Helper functions that power the MCP analytics tools. All queries
 * automatically tenant-scoped via Prisma AsyncLocalStorage middleware.
 */

import prisma from "@/config/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DailyBreakdownRow {
  date: string;
  revenue: string;
  units: number;
  transactions: number;
}

export interface PeriodStats {
  revenue: string;
  units: number;
  transactions: number;
}

export interface ComparePeriodResult {
  rangeA: PeriodStats;
  rangeB: PeriodStats;
  delta: {
    revenue: { abs: string; pct: number | null };
    units: { abs: number; pct: number | null };
    transactions: { abs: number; pct: number | null };
  };
}

export interface ProductBreakdownRow {
  variationId: string;
  productId: string;
  productName: string;
  imsCode: string;
  units: number;
  revenue: string;
  pctOfTotal: number;
}

export interface VelocityRow {
  variationId: string;
  productName: string;
  imsCode: string;
  unitsSold: number;
  avgPerDay: number;
}

export interface LastSoldRow {
  variationId: string;
  lastSaleDate: string | null;
}

// ─── 1. Daily Breakdown ───────────────────────────────────────────────────────

export async function getDailyBreakdown(params: {
  from: Date;
  to: Date;
  locationId?: string;
}): Promise<DailyBreakdownRow[]> {
  const { from, to, locationId } = params;

  // Build WHERE clause
  const where: Record<string, any> = {
    isLatest: true,
    createdAt: { gte: from, lt: to },
  };
  if (locationId) where.locationId = locationId;

  // Raw SQL for efficient date truncation
  const whereClause = locationId ? `AND s.location_id = '${locationId}'` : "";

  const rows = await prisma.$queryRaw<
    Array<{
      date: string;
      revenue: string;
      units: number | bigint;
      transactions: number | bigint;
    }>
  >(
    `
    SELECT
      DATE_TRUNC('day', s."created_at")::DATE AS date,
      COALESCE(SUM(s.total), 0) AS revenue,
      COALESCE(SUM(si.quantity), 0) AS units,
      COUNT(DISTINCT s.id) AS transactions
    FROM sales s
    LEFT JOIN sale_items si ON s.id = si.sale_id
    WHERE
      s.is_latest = true
      AND s."created_at" >= $1
      AND s."created_at" < $2
      ${whereClause}
    GROUP BY DATE_TRUNC('day', s."created_at")
    ORDER BY date ASC
  ` as any,
    from,
    to,
  );

  // Ensure complete date range (fill zeros)
  const result: DailyBreakdownRow[] = [];
  const currentDate = new Date(from);

  const rowsByDate = new Map<string, (typeof rows)[0]>();
  for (const row of rows) {
    const dateStr = row.date;
    rowsByDate.set(dateStr, row);
  }

  while (currentDate < to) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const row = rowsByDate.get(dateStr);

    result.push({
      date: dateStr,
      revenue: row?.revenue ?? "0",
      units: Number(row?.units ?? 0),
      transactions: Number(row?.transactions ?? 0),
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}

// ─── 2. Compare Period ────────────────────────────────────────────────────────

async function getPeriodStats(params: {
  from: Date;
  to: Date;
  locationId?: string;
}): Promise<PeriodStats> {
  const { from, to, locationId } = params;

  const where: Record<string, any> = {
    isLatest: true,
    createdAt: { gte: from, lt: to },
  };
  if (locationId) where.locationId = locationId;

  const [agg, count] = await Promise.all([
    prisma.sale.aggregate({
      where,
      _sum: { total: true },
    }),
    prisma.sale.count({ where }),
  ]);

  // Sum units across all sale items in the period
  const whereClauseUnits = locationId
    ? `AND s.location_id = '${locationId}'`
    : "";

  const itemsResult = await prisma.$queryRaw<Array<{ total: bigint }>>(
    `
    SELECT COALESCE(SUM(si.quantity), 0) AS total
    FROM sale_items si
    INNER JOIN sales s ON si.sale_id = s.id
    WHERE
      s.is_latest = true
      AND s."created_at" >= $1
      AND s."created_at" < $2
      ${whereClauseUnits}
  ` as any,
    from,
    to,
  );

  const units = Number(itemsResult[0]?.total ?? 0);

  return {
    revenue: agg._sum.total?.toString() ?? "0",
    units,
    transactions: count,
  };
}

export async function getComparePeriodData(params: {
  rangeA: { from: Date; to: Date };
  rangeB: { from: Date; to: Date };
  locationId?: string;
}): Promise<ComparePeriodResult> {
  const { rangeA, rangeB, locationId } = params;

  const [statsA, statsB] = await Promise.all([
    getPeriodStats({ ...rangeA, locationId }),
    getPeriodStats({ ...rangeB, locationId }),
  ]);

  const revA = parseFloat(statsA.revenue);
  const revB = parseFloat(statsB.revenue);
  const revAbs = revB - revA;
  const revPct = revA !== 0 ? (revAbs / revA) * 100 : null;

  const unitsAbs = statsB.units - statsA.units;
  const unitsPct = statsA.units !== 0 ? (unitsAbs / statsA.units) * 100 : null;

  const txnAbs = statsB.transactions - statsA.transactions;
  const txnPct =
    statsA.transactions !== 0 ? (txnAbs / statsA.transactions) * 100 : null;

  return {
    rangeA: statsA,
    rangeB: statsB,
    delta: {
      revenue: {
        abs: revAbs.toString(),
        pct: revPct !== null ? parseFloat(revPct.toFixed(2)) : null,
      },
      units: {
        abs: unitsAbs,
        pct: unitsPct !== null ? parseFloat(unitsPct.toFixed(2)) : null,
      },
      transactions: {
        abs: txnAbs,
        pct: txnPct !== null ? parseFloat(txnPct.toFixed(2)) : null,
      },
    },
  };
}

// ─── 3. Sales by Product ──────────────────────────────────────────────────────

export async function getProductBreakdown(params: {
  from: Date;
  to: Date;
  topN: number;
  sortBy: "revenue" | "units";
  locationId?: string;
}): Promise<ProductBreakdownRow[]> {
  const { from, to, topN, sortBy, locationId } = params;

  // Raw SQL for efficient aggregation with joins
  const whereClauseProducts = locationId
    ? `AND s.location_id = '${locationId}'`
    : "";
  const orderByClause =
    sortBy === "revenue"
      ? `COALESCE(SUM(si.line_total), 0) DESC`
      : `COALESCE(SUM(si.quantity), 0) DESC`;

  const rows = await prisma.$queryRaw<
    Array<{
      variation_id: string;
      product_id: string;
      product_name: string;
      ims_code: string;
      units: number | bigint;
      revenue: string;
    }>
  >(
    `
    SELECT
      pv.variation_id,
      p.product_id,
      p.product_name,
      p.ims_code,
      COALESCE(SUM(si.quantity), 0) AS units,
      COALESCE(SUM(si.line_total), 0) AS revenue
    FROM sale_items si
    INNER JOIN product_variations pv ON si.variation_id = pv.variation_id
    INNER JOIN products p ON pv.product_id = p.product_id
    INNER JOIN sales s ON si.sale_id = s.id
    WHERE
      s.is_latest = true
      AND s."created_at" >= $1
      AND s."created_at" < $2
      ${whereClauseProducts}
    GROUP BY pv.variation_id, p.product_id, p.product_name, p.ims_code
    ORDER BY ${orderByClause}
    LIMIT $3
  ` as any,
    from,
    to,
    topN,
  );

  // Calculate total revenue or units for percentage
  const selectClause =
    sortBy === "revenue"
      ? `COALESCE(SUM(si.line_total), 0)`
      : `COALESCE(SUM(si.quantity), 0)`;
  const whereClauseTotals = locationId
    ? `AND s.location_id = '${locationId}'`
    : "";

  const totalsResult = await prisma.$queryRaw<Array<{ total: string }>>(
    `
    SELECT
      ${selectClause} AS total
    FROM sale_items si
    INNER JOIN sales s ON si.sale_id = s.id
    WHERE
      s.is_latest = true
      AND s."created_at" >= $1
      AND s."created_at" < $2
      ${whereClauseTotals}
  ` as any,
    from,
    to,
  );

  const total =
    sortBy === "revenue"
      ? parseFloat(totalsResult[0]?.total ?? "0")
      : Number(totalsResult[0]?.total ?? 0);

  return rows.map((row) => {
    const value =
      sortBy === "revenue" ? parseFloat(row.revenue) : Number(row.units);
    const pct = total > 0 ? (value / total) * 100 : 0;

    return {
      variationId: row.variation_id,
      productId: row.product_id,
      productName: row.product_name,
      imsCode: row.ims_code,
      units: Number(row.units),
      revenue: row.revenue,
      pctOfTotal: parseFloat(pct.toFixed(2)),
    };
  });
}

// ─── 4. Sales Velocity ────────────────────────────────────────────────────────

export async function getVelocityMetrics(params: {
  windowDays: number;
  variationIds?: string[];
}): Promise<VelocityRow[]> {
  const { windowDays, variationIds } = params;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);

  const variationFilter =
    variationIds && variationIds.length > 0
      ? `AND pv.variation_id = ANY($2)`
      : "";
  const limitClause =
    !variationIds || variationIds.length === 0 ? ` LIMIT 100` : "";

  const rows = await prisma.$queryRaw<
    Array<{
      variation_id: string;
      product_name: string;
      ims_code: string;
      units_sold: number | bigint;
      avg_per_day: number;
    }>
  >(
    `
    SELECT
      pv.variation_id,
      p.product_name,
      p.ims_code,
      COALESCE(SUM(si.quantity), 0) AS units_sold,
      COALESCE(SUM(si.quantity), 0)::FLOAT / $1 AS avg_per_day
    FROM sale_items si
    INNER JOIN product_variations pv ON si.variation_id = pv.variation_id
    INNER JOIN products p ON pv.product_id = p.product_id
    INNER JOIN sales s ON si.sale_id = s.id
    WHERE
      s.is_latest = true
      AND s."created_at" >= $2
      ${variationFilter}
    GROUP BY pv.variation_id, p.product_name, p.ims_code
    ORDER BY avg_per_day DESC
    ${limitClause}
  ` as any,
    windowDays,
    cutoffDate,
    variationIds && variationIds.length > 0 ? variationIds : undefined,
  );

  return rows.map((row) => ({
    variationId: row.variation_id,
    productName: row.product_name,
    imsCode: row.ims_code,
    unitsSold: Number(row.units_sold),
    avgPerDay: parseFloat(row.avg_per_day.toFixed(2)),
  }));
}

// ─── 5. Last Sold Date ────────────────────────────────────────────────────────

export async function getLastSoldDates(params: {
  variationIds: string[];
}): Promise<LastSoldRow[]> {
  const { variationIds } = params;

  const rows = await prisma.$queryRaw<
    Array<{
      variation_id: string;
      last_sale_date: string | null;
    }>
  >(
    `
    SELECT
      pv.variation_id,
      MAX(s."created_at")::DATE AS last_sale_date
    FROM product_variations pv
    LEFT JOIN sale_items si ON pv.variation_id = si.variation_id
    LEFT JOIN sales s ON si.sale_id = s.id AND s.is_latest = true
    WHERE pv.variation_id = ANY($1)
    GROUP BY pv.variation_id
    ORDER BY pv.variation_id
  ` as any,
    variationIds,
  );

  return rows.map((row) => ({
    variationId: row.variation_id,
    lastSaleDate: row.last_sale_date,
  }));
}
