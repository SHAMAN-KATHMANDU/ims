"use client";

/**
 * Data Explorer (Pivot): full-page pivot table with drag-and-drop, table + Plotly charts.
 * Combined data: products, locations, inventory. Unified row schema (no undefined).
 * Admin/superAdmin only.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  PivotTableUI,
  TableRenderers,
  createPlotlyRenderers,
} from "@imc-trading/react-pivottable";
import "@imc-trading/react-pivottable/pivottable.css";
import { useAnalyticsFilters } from "@/features/analytics";
import {
  useLocationComparisonAnalytics,
  useCustomersPromosAnalytics,
  useInventoryOpsAnalytics,
} from "@/features/analytics";
import { useProductsPaginated } from "@/features/products";
import { AnalyticsFilterBar } from "./AnalyticsFilterBar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Plot = dynamic(
  () => import("react-plotly.js").then((mod) => mod.default),
  { ssr: false },
);

const PlotlyRenderers =
  typeof window !== "undefined" ? createPlotlyRenderers(Plot) : {};

type PivotRow = {
  Type: string;
  Product: string;
  Category: string;
  CostPrice: number;
  MRP: number;
  Revenue: number;
  Qty: number;
  Margin: number;
  VariationsCount: number;
  Location: string;
  SalesCount: number;
  Discount: number;
  StockValue: number;
};

const EMPTY_ROW: PivotRow = {
  Type: "",
  Product: "",
  Category: "",
  CostPrice: 0,
  MRP: 0,
  Revenue: 0,
  Qty: 0,
  Margin: 0,
  VariationsCount: 0,
  Location: "",
  SalesCount: 0,
  Discount: 0,
  StockValue: 0,
};

function toPivotRow(overrides: Partial<PivotRow>): PivotRow {
  const row: PivotRow = { ...EMPTY_ROW };
  for (const k of Object.keys(overrides) as (keyof PivotRow)[]) {
    const v = overrides[k];
    if (v !== undefined && v !== null) {
      (row as Record<string, string | number>)[k] =
        typeof v === "number" ? (Number.isFinite(v) ? v : 0) : String(v);
    }
  }
  return row;
}

/** Remove undefined everywhere so immutability-helper never sees it. */
function sanitizePivotState(
  obj: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (obj == null || typeof obj !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      out[key] = val.map((item) =>
        item !== null && typeof item === "object" && !Array.isArray(item)
          ? sanitizePivotState(item as Record<string, unknown>)
          : item,
      );
    } else if (val !== null && typeof val === "object") {
      out[key] = sanitizePivotState(val as Record<string, unknown>);
    } else {
      out[key] = val;
    }
  }
  return out;
}

/** Ensure a pivot row has every key from EMPTY_ROW with no undefined (for library/ hasOwnProperty). */
function sanitizePivotRow(row: PivotRow): PivotRow {
  const out = { ...EMPTY_ROW };
  for (const k of Object.keys(EMPTY_ROW) as (keyof PivotRow)[]) {
    const v = row[k];
    if (v === undefined || v === null) {
      (out as Record<string, string | number>)[k] =
        typeof EMPTY_ROW[k] === "number" ? 0 : "";
    } else {
      (out as Record<string, string | number>)[k] =
        typeof v === "number" ? (Number.isFinite(v) ? v : 0) : String(v);
    }
  }
  return out;
}

/**
 * Deep clone and strip undefined so immutability-helper never sees undefined.
 * Use for any object passed to the pivot library.
 */
function ensureNoUndefinedInObject(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      out[key] = val
        .map((item) =>
          item !== null && typeof item === "object" && !Array.isArray(item)
            ? ensureNoUndefinedInObject(item as Record<string, unknown>)
            : item,
        )
        .filter((x) => x !== undefined);
    } else if (val !== null && typeof val === "object") {
      out[key] = ensureNoUndefinedInObject(val as Record<string, unknown>);
    } else {
      out[key] = val;
    }
  }
  return out;
}

function arraysEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function pivotStateEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  if (a.aggregatorName !== b.aggregatorName) return false;
  if (a.rendererName !== b.rendererName) return false;
  if (a.rowOrder !== b.rowOrder) return false;
  if (a.colOrder !== b.colOrder) return false;
  if (!arraysEqual((a.rows as unknown[]) ?? [], (b.rows as unknown[]) ?? []))
    return false;
  if (!arraysEqual((a.cols as unknown[]) ?? [], (b.cols as unknown[]) ?? []))
    return false;
  if (!arraysEqual((a.vals as unknown[]) ?? [], (b.vals as unknown[]) ?? []))
    return false;
  return true;
}

const DEFAULT_PIVOT_STATE: Record<string, unknown> = {
  rows: ["Type"],
  cols: ["Category"],
  vals: ["Revenue"],
  aggregatorName: "Sum",
  valueFilter: {},
  sorters: {},
  rowOrder: "key_a_to_z",
  colOrder: "key_a_to_z",
  rendererName: "Table",
};

const DEFAULT_ROWS = DEFAULT_PIVOT_STATE.rows as string[];
const DEFAULT_COLS = DEFAULT_PIVOT_STATE.cols as string[];
const DEFAULT_VALS = DEFAULT_PIVOT_STATE.vals as string[];

export function PivotPage() {
  const { apiParams } = useAnalyticsFilters();
  const { data: locationData } = useLocationComparisonAnalytics(apiParams);
  const { data: customersData } = useCustomersPromosAnalytics(apiParams);
  const { data: inventoryData } = useInventoryOpsAnalytics(apiParams);
  const { data: productsResponse } = useProductsPaginated({ limit: 10 });
  const products = useMemo(
    () => productsResponse?.data ?? [],
    [productsResponse?.data],
  );

  const pivotData = useMemo(() => {
    const rows: PivotRow[] = [];
    const perfs = customersData?.productPerformance ?? [];
    const perfMap = new Map(perfs.map((p) => [p.productId, p]));
    for (const p of products) {
      const perf = perfMap.get(p.id);
      rows.push(
        toPivotRow({
          Type: "Product",
          Product: String(p?.name ?? ""),
          Category: String(p?.category?.name ?? "-"),
          CostPrice: Number(p?.costPrice) || 0,
          MRP: Number(p?.mrp) || 0,
          Revenue: Number(perf?.revenue) || 0,
          Qty: Number(perf?.quantity) || 0,
          Margin: Number(perf?.margin) || 0,
          VariationsCount: Array.isArray(p?.variations)
            ? p.variations.length
            : 0,
        }),
      );
    }
    const locs = locationData ?? [];
    for (const l of locs) {
      rows.push(
        toPivotRow({
          Type: "Location",
          Location: String((l as { locationName?: string }).locationName ?? ""),
          Revenue: Number((l as { revenue?: number }).revenue) || 0,
          SalesCount: Number((l as { salesCount?: number }).salesCount) || 0,
          Discount: Number((l as { discount?: number }).discount) || 0,
        }),
      );
    }
    const heatmap = inventoryData?.heatmap ?? [];
    for (const row of heatmap) {
      const r = row as Record<string, unknown>;
      const category = String(r?.category ?? "Other");
      const keys = r ? Object.keys(r) : [];
      for (const key of keys) {
        if (key === "category" || key === "total") continue;
        const val = r[key];
        if (typeof val === "number" && Number.isFinite(val)) {
          rows.push(
            toPivotRow({
              Type: "Inventory",
              Category: category,
              Location: String(key),
              StockValue: val,
            }),
          );
        }
      }
    }
    const filtered = rows.filter(
      (r): r is PivotRow => r != null && typeof r === "object",
    );
    return filtered
      .map((r) => sanitizePivotRow(r))
      .filter((r): r is PivotRow => r != null && typeof r === "object");
  }, [
    products,
    customersData?.productPerformance,
    locationData,
    inventoryData?.heatmap,
  ]);

  const [pivotState, setPivotState] = useState<Record<string, unknown>>(() => ({
    ...DEFAULT_PIVOT_STATE,
    valueFilter: {},
    sorters: {},
  }));

  const onChangeInProgressRef = useRef(false);
  const lastValueFilterRef = useRef<Record<string, unknown>>({});
  const lastSortersRef = useRef<Record<string, unknown>>({});
  useEffect(() => {
    onChangeInProgressRef.current = false;
  });

  const renderers = useMemo(
    () => ({ ...TableRenderers, ...PlotlyRenderers }),
    [],
  );

  const rendererOptions = useMemo(
    () =>
      Object.keys(renderers).sort((a, b) => {
        const tableFirst = (x: string) => (x.startsWith("Table") ? 0 : 1);
        if (tableFirst(a) !== tableFirst(b))
          return tableFirst(a) - tableFirst(b);
        return a.localeCompare(b);
      }),
    [renderers],
  );

  const setRendererName = useCallback((rendererName: string) => {
    setPivotState((prev) => ({
      ...sanitizePivotState(prev),
      rendererName,
      valueFilter:
        prev?.valueFilter != null && typeof prev.valueFilter === "object"
          ? sanitizePivotState(prev.valueFilter as Record<string, unknown>)
          : {},
      sorters:
        prev?.sorters != null && typeof prev.sorters === "object"
          ? sanitizePivotState(prev.sorters as Record<string, unknown>)
          : {},
    }));
  }, []);

  const handlePivotChange = useCallback((s: Record<string, unknown>) => {
    if (onChangeInProgressRef.current) return;
    const next = sanitizePivotState(s);
    const valueFilter =
      next.valueFilter != null && typeof next.valueFilter === "object"
        ? (next.valueFilter as Record<string, unknown>)
        : {};
    const sorters =
      next.sorters != null && typeof next.sorters === "object"
        ? (next.sorters as Record<string, unknown>)
        : {};
    setPivotState((prev) => {
      if (pivotStateEqual(prev, next)) return prev;
      const nextState = ensureNoUndefinedInObject({
        ...DEFAULT_PIVOT_STATE,
        ...next,
        valueFilter: Object.keys(valueFilter).length
          ? sanitizePivotState(valueFilter)
          : {},
        sorters: Object.keys(sorters).length ? sanitizePivotState(sorters) : {},
      });
      return nextState as Record<string, unknown>;
    });
    onChangeInProgressRef.current = true;
  }, []);

  const stableProps = useMemo(() => {
    const rows = Array.isArray(pivotState.rows)
      ? pivotState.rows.filter((x): x is string => x != null)
      : [];
    const cols = Array.isArray(pivotState.cols)
      ? pivotState.cols.filter((x): x is string => x != null)
      : [];
    const vals = Array.isArray(pivotState.vals)
      ? pivotState.vals.filter((x): x is string => x != null)
      : [];
    const valueFilterRaw =
      pivotState.valueFilter != null &&
      typeof pivotState.valueFilter === "object" &&
      !Array.isArray(pivotState.valueFilter)
        ? sanitizePivotState(pivotState.valueFilter as Record<string, unknown>)
        : {};
    const sortersRaw =
      pivotState.sorters != null &&
      typeof pivotState.sorters === "object" &&
      !Array.isArray(pivotState.sorters)
        ? sanitizePivotState(pivotState.sorters as Record<string, unknown>)
        : {};
    const valueFilter =
      JSON.stringify(valueFilterRaw) ===
      JSON.stringify(lastValueFilterRef.current)
        ? lastValueFilterRef.current
        : (lastValueFilterRef.current = valueFilterRaw);
    const sorters =
      JSON.stringify(sortersRaw) === JSON.stringify(lastSortersRef.current)
        ? lastSortersRef.current
        : (lastSortersRef.current = sortersRaw);
    return {
      rows: rows.length ? rows : DEFAULT_ROWS,
      cols: cols.length ? cols : DEFAULT_COLS,
      vals: vals.length ? vals : DEFAULT_VALS,
      aggregatorName:
        typeof pivotState.aggregatorName === "string"
          ? pivotState.aggregatorName
          : (DEFAULT_PIVOT_STATE.aggregatorName as string),
      valueFilter,
      sorters,
      rowOrder:
        typeof pivotState.rowOrder === "string"
          ? pivotState.rowOrder
          : (DEFAULT_PIVOT_STATE.rowOrder as string),
      colOrder:
        typeof pivotState.colOrder === "string"
          ? pivotState.colOrder
          : (DEFAULT_PIVOT_STATE.colOrder as string),
      rendererName:
        typeof pivotState.rendererName === "string"
          ? pivotState.rendererName
          : (DEFAULT_PIVOT_STATE.rendererName as string),
    };
  }, [
    pivotState.rows,
    pivotState.cols,
    pivotState.vals,
    pivotState.aggregatorName,
    pivotState.valueFilter,
    pivotState.sorters,
    pivotState.rowOrder,
    pivotState.colOrder,
    pivotState.rendererName,
  ]);

  const isLoading = !customersData && !locationData && !inventoryData;

  if (isLoading && pivotData.length === 0) {
    return (
      <div
        className="reports-container min-w-0 w-full max-w-full flex flex-col gap-4"
        data-reports
      >
        <header>
          <h1 className="text-2xl font-bold md:text-3xl">
            Data Explorer (Pivot)
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Drag attributes to Rows/Columns; pick aggregator and chart type.
          </p>
        </header>
        <div className="min-w-0">
          <AnalyticsFilterBar />
        </div>
        <div className="min-w-0 flex-1">
          <Skeleton className="h-[60vh] w-full" />
        </div>
      </div>
    );
  }

  const currentRenderer = (pivotState.rendererName as string) ?? "Table";

  return (
    <div
      className="reports-container min-w-0 w-full max-w-full flex flex-col gap-4 h-full"
      data-reports
    >
      <header className="shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">
              Data Explorer (Pivot)
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              Drag attributes to Rows/Columns; pick aggregator (Sum, Count,
              Average). {pivotData.length} rows.
            </p>
          </div>
          <Select value={currentRenderer} onValueChange={setRendererName}>
            <SelectTrigger className="w-[220px] shrink-0">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              {rendererOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="min-w-0 shrink-0">
        <AnalyticsFilterBar />
      </div>

      <div className="reports-pivot min-w-0 flex-1 overflow-auto" data-reports>
        <PivotTableUI
          data={pivotData}
          onChange={handlePivotChange}
          renderers={renderers}
          rows={
            Array.isArray(stableProps.rows) ? stableProps.rows : DEFAULT_ROWS
          }
          cols={
            Array.isArray(stableProps.cols) ? stableProps.cols : DEFAULT_COLS
          }
          vals={
            Array.isArray(stableProps.vals) ? stableProps.vals : DEFAULT_VALS
          }
          aggregatorName={
            typeof stableProps.aggregatorName === "string"
              ? stableProps.aggregatorName
              : "Sum"
          }
          valueFilter={
            stableProps.valueFilter &&
            typeof stableProps.valueFilter === "object" &&
            !Array.isArray(stableProps.valueFilter)
              ? ensureNoUndefinedInObject(
                  stableProps.valueFilter as Record<string, unknown>,
                )
              : {}
          }
          sorters={
            stableProps.sorters &&
            typeof stableProps.sorters === "object" &&
            !Array.isArray(stableProps.sorters)
              ? ensureNoUndefinedInObject(
                  stableProps.sorters as Record<string, unknown>,
                )
              : {}
          }
          rowOrder={
            typeof stableProps.rowOrder === "string"
              ? stableProps.rowOrder
              : "key_a_to_z"
          }
          colOrder={
            typeof stableProps.colOrder === "string"
              ? stableProps.colOrder
              : "key_a_to_z"
          }
          rendererName={
            typeof stableProps.rendererName === "string"
              ? stableProps.rendererName
              : "Table"
          }
          derivedAttributes={{}}
          hiddenAttributes={[]}
          hiddenFromAggregators={[]}
          hiddenFromDragDrop={[]}
          unusedOrientationCutoff={85}
          menuLimit={500}
        />
      </div>
    </div>
  );
}
