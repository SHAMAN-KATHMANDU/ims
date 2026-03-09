"use client";

/**
 * Funnel chart for transfer status: pending → approved → in-transit → completed.
 */

import { snapWidthPercent } from "@/lib/chart-utils";

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
  ariaLabel?: string;
}

export function TransferFunnel({
  data,
  formatValue = (n) => String(n),
  ariaLabel = "Transfer funnel: Pending to Completed",
}: TransferFunnelProps) {
  const max = Math.max(...STEPS.map((s) => data[s.key]), 1);

  return (
    <div className="space-y-3" role="region" aria-label={ariaLabel}>
      {STEPS.map(({ key, label }) => {
        const value = data[key];
        const width = snapWidthPercent(value, max);
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{label}</span>
              <span className="text-muted-foreground">
                {formatValue(value)}
              </span>
            </div>
            <div className="h-6 w-full rounded overflow-hidden chart-progress-track">
              <div className="chart-progress-fill" data-width={width} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
