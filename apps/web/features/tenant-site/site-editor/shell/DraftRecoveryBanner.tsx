/**
 * Draft recovery banner.
 *
 * Renders when a persisted local draft is detected on mount and the editor
 * hasn't yet adopted it. Offers Restore (load the draft into the store) and
 * Discard (drop the persisted draft).
 */

"use client";

import { useState } from "react";
import { History, X } from "lucide-react";
import type { DraftRecoveryState } from "../hooks/useDraftRecovery";

interface DraftRecoveryBannerProps {
  recovery: DraftRecoveryState | null;
}

function formatAge(ms: number | null): string {
  if (ms === null) return "earlier";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "moments ago";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

export function DraftRecoveryBanner({ recovery }: DraftRecoveryBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!recovery || !recovery.isDraft || dismissed) return null;

  const handleRestore = (): void => {
    recovery.onRestore();
    setDismissed(true);
  };

  const handleDiscard = (): void => {
    recovery.onDiscard();
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-4 py-2"
    >
      <div className="flex items-center gap-2 text-sm text-amber-900">
        <History className="h-4 w-4" />
        <span>
          Unsaved changes from {formatAge(recovery.draftAge)}. Restore them?
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleRestore}
          className="rounded border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
        >
          Restore
        </button>
        <button
          type="button"
          onClick={handleDiscard}
          className="rounded px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
        >
          Discard
        </button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="rounded p-1 text-amber-700 hover:bg-amber-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
