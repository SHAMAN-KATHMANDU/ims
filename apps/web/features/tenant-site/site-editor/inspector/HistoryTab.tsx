"use client";

import { useState } from "react";
import { usePageVersions, useRestorePageVersion } from "../../hooks/use-pages";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface HistoryTabProps {
  _workspace: string;
  pageId: string;
  _scope: string;
}

export function HistoryTab({ pageId }: HistoryTabProps) {
  const { data: versions } = usePageVersions(pageId);
  const restoreVersion = useRestorePageVersion();
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  const handleRestore = (versionId: string) => {
    restoreVersion.mutate({ pageId, versionId });
    setConfirmRestore(null);
  };

  if (!versions || versions.length === 0) {
    return (
      <div
        className="p-3.5 text-xs text-center"
        style={{ color: "var(--ink-4)" }}
      >
        No version history yet.
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "var(--bg)",
      }}
    >
      {versions.map((version, idx) => (
        <div
          key={version.id}
          className="px-3.5 py-2.5 border-b flex gap-2.5"
          style={{
            borderBottomColor: "var(--line-2)",
          }}
        >
          <div className="pt-1 relative">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: "var(--ink-4)",
              }}
            />
            {idx < versions.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  left: "3px",
                  top: "8px",
                  bottom: "-12px",
                  width: "1px",
                  backgroundColor: "var(--line)",
                }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-xs font-medium"
              style={{ color: "var(--ink)" }}
            >
              Auto-saved
            </div>
            <div
              className="text-xs mt-0.5 font-mono"
              style={{ color: "var(--ink-4)" }}
            >
              {new Date(version.createdAt).toLocaleDateString()}{" "}
              {new Date(version.createdAt).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
          <button
            onClick={() => setConfirmRestore(version.id)}
            className="text-xs font-mono hover:text-blue-600"
            style={{ color: "var(--ink-3)" }}
          >
            restore
          </button>

          <AlertDialog open={confirmRestore === version.id}>
            <AlertDialogContent>
              <AlertDialogTitle>Restore version?</AlertDialogTitle>
              <AlertDialogDescription>
                This will restore the page to this version. This action cannot
                be undone.
              </AlertDialogDescription>
              <div className="flex justify-end gap-2">
                <AlertDialogCancel onClick={() => setConfirmRestore(null)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleRestore(version.id)}
                  disabled={restoreVersion.isPending}
                >
                  Restore
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  );
}
