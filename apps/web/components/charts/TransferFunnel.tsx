"use client";

/**
 * Funnel chart for transfer status: pending → approved → in-transit → completed.
 */

import { formatCurrency } from "@/lib/format";

export interface TransferFunnelCounts {
  PENDING: number;
  APPROVED: number;
  IN_TRANSIT: number;
  COMPLETED: number;
}

const STEPS = [
  { key: "PENDING" as const, label: "Pending" },
  { key: "APPROVED" as const, label: "Approved" },
  { key: "IN_TRANSIT" as const, label: "In transit" },
  { key: "COMPLETED" as const, label: "Completed" },
];

interface TransferFunnelProps {
  data: TransferFunnelCounts;
  formatValue?: (n: number) => string;
}

export function TransferFunnel({
  data,
  formatValue = (n) => String(n),
}: TransferFunnelProps) {
  const max = Math.max(...STEPS.map((s) => data[s.key]), 1);

  return (
    <div className="space-y-3">
      {STEPS.map(({ key, label }) => {
        const value = data[key];
        const pct = max > 0 ? (value / max) * 100 : 0;
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{label}</span>
              <span className="text-muted-foreground">
                {formatValue(value)}
              </span>
            </div>
            <div className="h-6 w-full bg-secondary rounded overflow-hidden">
              <div
                className="h-full bg-primary rounded transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
