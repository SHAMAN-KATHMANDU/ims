import type { ComponentType } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Compact KPI/metric card matching the Helm dashboard tiles. */
export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  deltaClassName,
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  icon?: ComponentType<{ className?: string }>;
  /** Tone for the delta line, e.g. "text-success" / "text-destructive". */
  deltaClassName?: string;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 p-4", className)}>
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-muted-foreground">
        {Icon ? <Icon className="h-[18px] w-[18px]" /> : null}
        {label}
      </div>
      <div className="mt-2.5 text-[27px] leading-none font-bold tracking-tight">
        {value}
      </div>
      {delta != null ? (
        <div
          className={cn(
            "mt-1.5 text-xs font-medium text-muted-foreground",
            deltaClassName,
          )}
        >
          {delta}
        </div>
      ) : null}
    </Card>
  );
}
