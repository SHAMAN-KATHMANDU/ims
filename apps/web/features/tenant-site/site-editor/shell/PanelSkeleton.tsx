/**
 * Panel skeleton — drop-in loading placeholder shaped like a dock panel.
 *
 * Use inside any LeftDock panel when its query is loading. Shape mirrors a
 * typical panel: header line + search bar + 6 list rows. Cheaper than a
 * spinner and reads as the panel itself rather than a generic "wait".
 */

import { Skeleton } from "@/components/ui/skeleton";

interface PanelSkeletonProps {
  rows?: number;
  withSearch?: boolean;
}

export function PanelSkeleton({
  rows = 6,
  withSearch = true,
}: PanelSkeletonProps) {
  return (
    <div className="space-y-3 p-3" data-testid="panel-skeleton">
      {withSearch && <Skeleton className="h-8 w-full" />}
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
