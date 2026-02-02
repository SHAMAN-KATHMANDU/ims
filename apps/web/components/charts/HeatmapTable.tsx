"use client";

/**
 * Simple heatmap table: rows = categories, columns = locations, cell = value (e.g. stock value).
 * Color intensity by value; single place to change heatmap display.
 */

import { formatCurrency } from "@/lib/format";

export interface HeatmapRow {
  category: string;
  total?: number;
  [locationName: string]: string | number | undefined;
}

interface HeatmapTableProps {
  rows: HeatmapRow[];
  formatValue?: (n: number) => string;
}

function getLocationKeys(rows: HeatmapRow[]): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (k !== "category" && k !== "total") keys.add(k);
    }
  }
  return [...keys];
}

function getColorForValue(value: number, max: number): string {
  if (max <= 0) return "hsl(var(--muted))";
  const pct = value / max;
  const hue = 120 - pct * 120;
  return `hsl(${hue}, 70%, 45%)`;
}

export function HeatmapTable({
  rows,
  formatValue = formatCurrency,
}: HeatmapTableProps) {
  const locationKeys = getLocationKeys(rows);
  const maxVal = Math.max(
    ...rows.flatMap((r) => locationKeys.map((k) => Number(r[k] ?? 0))),
    1,
  );

  if (rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
        No data
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2 font-medium">Category</th>
            {locationKeys.map((loc) => (
              <th key={loc} className="text-right p-2 font-medium">
                {loc}
              </th>
            ))}
            <th className="text-right p-2 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="p-2 font-medium">{row.category}</td>
              {locationKeys.map((loc) => {
                const val = Number(row[loc] ?? 0);
                const color = getColorForValue(val, maxVal);
                return (
                  <td
                    key={loc}
                    className="text-right p-2"
                    style={{ backgroundColor: color, color: "#fff" }}
                  >
                    {formatValue(val)}
                  </td>
                );
              })}
              <td className="text-right p-2">
                {row.total != null ? formatValue(Number(row.total)) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
