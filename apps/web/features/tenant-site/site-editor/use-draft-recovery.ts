/**
 * Draft recovery hook for the site editor.
 * Detects unsaved drafts newer than the server version and provides recovery.
 */

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/useToast";
import type { SiteLayoutScope } from "@repo/shared";
import {
  selectLoad,
  useEditorStore,
  getPersistedDraft,
  clearPersistedDraft,
} from "./editor-store";

export interface DraftRecoveryState {
  /** Whether a recovery prompt should be shown. */
  shouldShowRecovery: boolean;
  /** Timestamp of the persisted draft (ms since epoch). */
  draftTimestamp: number | null;
  /** Handler to restore the draft. */
  handleRestore: () => void;
  /** Handler to discard the draft. */
  handleDiscard: () => void;
}

/**
 * Hook that manages draft recovery detection and UI state.
 * Call this when the layout data is loaded to check for recoverable drafts.
 */
export function useDraftRecovery(
  tenantId: string | null | undefined,
  scope: string | null | undefined,
  pageId: string | null | undefined,
  serverUpdatedAt: string | number | null | undefined,
): DraftRecoveryState {
  const { toast } = useToast();
  const [shouldShowRecovery, setShouldShowRecovery] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);

  const load = useEditorStore((s) => s.load);

  // Check for recoverable draft on mount
  useEffect(() => {
    if (!tenantId || !scope) return;

    const persisted = getPersistedDraft(tenantId, scope, pageId ?? undefined);
    if (!persisted || !persisted.dirty) return;

    // Parse server timestamp
    const serverTs = serverUpdatedAt
      ? new Date(serverUpdatedAt).getTime()
      : Date.now();
    const draftTs = persisted.savedAt ?? 0;

    // Only show recovery if draft is newer than server version
    if (draftTs > serverTs) {
      setDraftTimestamp(draftTs);
      setShouldShowRecovery(true);
    }
  }, [tenantId, scope, pageId, serverUpdatedAt]);

  const handleRestore = useCallback(() => {
    if (!tenantId || !scope) return;

    const persisted = getPersistedDraft(tenantId, scope, pageId ?? undefined);
    if (!persisted) return;

    // Load the persisted blocks and mark as dirty
    load(persisted.present.blocks);
    useEditorStore.setState({ dirty: true });

    setShouldShowRecovery(false);
    toast({ title: "Draft recovered" });
  }, [tenantId, scope, pageId, load, toast]);

  const handleDiscard = useCallback(() => {
    if (!tenantId || !scope) return;

    // Clear the persisted draft
    clearPersistedDraft(tenantId, scope, pageId ?? undefined);

    setShouldShowRecovery(false);
    toast({ title: "Draft discarded" });
  }, [tenantId, scope, pageId, toast]);

  return {
    shouldShowRecovery,
    draftTimestamp,
    handleRestore,
    handleDiscard,
  };
}
