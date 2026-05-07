"use client";

import { formatDistanceToNow } from "date-fns";
import { Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import {
  usePublishHistory,
  useRollbackPublish,
} from "../../../hooks/use-publish-history";

export function PublishHistoryPanel() {
  const { toast } = useToast();
  const historyQuery = usePublishHistory();
  const rollbackMutation = useRollbackPublish();

  const handleRollback = (versionId: string) => {
    if (
      confirm(
        "This will revert your site to a previous published version. Are you sure?",
      )
    ) {
      rollbackMutation.mutate(versionId, {
        onSuccess: () => {
          toast({ title: "Site rolled back to previous version" });
        },
        onError: () => {
          toast({
            title: "Rollback failed",
            variant: "destructive",
          });
        },
      });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-11 px-4 flex items-center border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">
          Publish History
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {historyQuery.isLoading && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Loading publish history…
          </div>
        )}

        {!historyQuery.isLoading && (historyQuery.data?.length ?? 0) === 0 && (
          <div className="text-center py-8 rounded-lg border border-dashed border-border bg-muted/30">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
            <div className="text-sm font-medium text-foreground/80">
              No publish history
            </div>
            <div className="text-xs text-muted-foreground">
              Once you publish, versions will appear here.
            </div>
          </div>
        )}

        {historyQuery.data?.map((entry) => (
          <PublishHistoryEntry
            key={entry.id}
            entry={entry}
            onRollback={handleRollback}
            isPending={rollbackMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

interface PublishHistoryEntry {
  id: string;
  publishedAt: string;
  publishedBy?: string;
  summary?: string;
}

function PublishHistoryEntry({
  entry,
  onRollback,
  isPending,
}: {
  entry: PublishHistoryEntry;
  onRollback: (id: string) => void;
  isPending: boolean;
}) {
  const date = new Date(entry.publishedAt);
  return (
    <div className="p-3 rounded-md border border-border bg-card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-foreground">
            {date.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground/60 mt-0.5">
            {entry.publishedBy && <>by {entry.publishedBy}</>}
          </div>
          {entry.summary && (
            <div className="text-xs text-muted-foreground mt-1">
              {entry.summary}
            </div>
          )}
        </div>
      </div>
      <div className="pt-2 border-t border-border/50">
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs h-7"
          onClick={() => onRollback(entry.id)}
          disabled={isPending}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Rollback to this version
        </Button>
      </div>
    </div>
  );
}
