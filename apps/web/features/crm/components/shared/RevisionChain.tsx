import { cn } from "@/lib/utils";

export interface RevisionEntry {
  no: number;
  change: string;
  at?: string;
  by?: string;
}

/**
 * Immutable deal-revision chain (Helm design): numbered nodes connected by a
 * line; the latest revision is highlighted. Deals are append-only — each edit
 * is a new revision rather than an in-place mutation.
 */
export function RevisionChain({
  revisions,
  className,
}: {
  revisions: RevisionEntry[];
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      {revisions.map((r, i) => {
        const last = i === revisions.length - 1;
        return (
          <div
            key={r.no}
            className={cn("flex gap-3.5", last ? "pb-0" : "pb-4")}
          >
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] font-semibold",
                  last
                    ? "bg-primary text-primary-foreground"
                    : "border bg-secondary text-muted-foreground",
                )}
              >
                {r.no}
              </div>
              {!last && <div className="mt-1 w-0.5 flex-1 bg-border" />}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium">{r.change}</div>
              {(r.at || r.by) && (
                <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {[r.at, r.by].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
