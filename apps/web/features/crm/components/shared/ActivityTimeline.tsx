import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface TimelineItem {
  id?: string;
  icon: ComponentType<{ className?: string }>;
  /** Background tone class for the icon node, e.g. "bg-info" / "bg-success". */
  iconBgClassName?: string;
  title: ReactNode;
  body?: ReactNode;
  meta?: ReactNode;
}

/**
 * Vertical activity timeline with colored icon nodes and a connector line.
 * Shared by the dashboard "Recent activity" feed and the contact detail
 * timeline tab (Helm design).
 */
export function ActivityTimeline({
  items,
  className,
  emptyLabel = "No activity yet.",
}: {
  items: TimelineItem[];
  className?: string;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <div className={cn("text-[13px] text-muted-foreground", className)}>
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col", className)}>
      {items.map((it, i) => {
        const Icon = it.icon;
        const last = i === items.length - 1;
        return (
          <div
            key={it.id ?? i}
            className={cn("flex gap-3.5", last ? "pb-0" : "pb-4")}
          >
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-white",
                  it.iconBgClassName ?? "bg-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              {!last && <div className="mt-1 w-0.5 flex-1 bg-border" />}
            </div>
            <div className="flex-1 pt-0.5">
              <div className="text-[13px]">{it.title}</div>
              {it.body != null ? (
                <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {it.body}
                </div>
              ) : null}
              {it.meta != null ? (
                <div className="mt-1 text-[11.5px] text-muted-foreground">
                  {it.meta}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
