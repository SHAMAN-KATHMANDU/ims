"use client";

/**
 * VersionHistorySheet — right-rail sheet showing the version history for
 * the currently-edited blog post or custom page (Phase 4).
 *
 * Reads the version list via a caller-supplied `useVersions(id)` hook so
 * one component can serve both blog posts and tenant pages (the queries
 * differ by URL but the row shape is identical).
 *
 * Restore happens via a second caller-supplied mutation; on success the
 * parent's data invalidates and the sheet closes automatically.
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { History, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export interface VersionListItem {
  id: string;
  createdAt: string;
  editorId: string | null;
  note: string | null;
}

interface UseVersionsResult {
  data: VersionListItem[] | undefined;
  isLoading: boolean;
  error: unknown;
  refetch?: () => void;
}

interface UseRestoreResult {
  mutateAsync: (input: { id: string; versionId: string }) => Promise<unknown>;
  isPending: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  recordLabel: string;
  useVersions: (id: string | null) => UseVersionsResult;
  useRestore: () => UseRestoreResult;
  /** Title shown in the sheet header — e.g. "Post history" or "Page history". */
  title?: string;
}

function fmtDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function VersionHistorySheet({
  open,
  onOpenChange,
  recordId,
  recordLabel,
  useVersions,
  useRestore,
  title = "History",
}: Props) {
  const { toast } = useToast();
  const versions = useVersions(open ? recordId : null);
  const restore = useRestore();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col overflow-hidden sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4" aria-hidden="true" />
            {title}
          </SheetTitle>
          <SheetDescription>
            Snapshots of {recordLabel}. Restoring a version writes a new
            snapshot of the current state first, so every restore is undoable.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {versions.isLoading && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {versions.error !== undefined && versions.error !== null && (
            <p className="text-sm text-destructive">Failed to load history.</p>
          )}
          {versions.data && versions.data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No versions yet. Versions are written every time you save.
            </p>
          )}
          <ul className="space-y-2">
            {(versions.data ?? []).map((v) => (
              <li
                key={v.id}
                className="rounded-md border border-border p-3 space-y-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">
                    {fmtDate(v.createdAt)}
                  </span>
                  {v.note && (
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {v.note}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {v.editorId ? `by ${v.editorId.slice(0, 8)}…` : "system"}
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={restore.isPending}
                    onClick={async () => {
                      try {
                        await restore.mutateAsync({
                          id: recordId,
                          versionId: v.id,
                        });
                        toast({
                          title: "Restored",
                          description: "The record has been rolled back.",
                        });
                        onOpenChange(false);
                      } catch (err) {
                        toast({
                          title: "Restore failed",
                          description:
                            err instanceof Error ? err.message : undefined,
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <RefreshCw
                      className="mr-2 h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    Restore
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
