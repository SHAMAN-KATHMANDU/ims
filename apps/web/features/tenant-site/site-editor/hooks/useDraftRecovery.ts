/**
 * Draft recovery: detect when a draft exists but is unpublished,
 * offer to restore it on component mount.
 */

import { useEffect, useState } from "react";
import { useEditorStore } from "../store/editor-store";
import { selectLoad } from "../store/selectors";
import { getPersistedDraft } from "../store/persistence";
import type { SiteLayoutScope } from "@repo/shared";

export interface DraftRecoveryState {
  isDraft: boolean;
  draftAge: number | null; // milliseconds since saved
  onRestore: () => void;
  onDiscard: () => void;
}

export function useDraftRecovery(
  tenantId: string,
  scope: SiteLayoutScope,
): DraftRecoveryState | null {
  const [state, setState] = useState<DraftRecoveryState | null>(null);
  const load = useEditorStore(selectLoad);

  useEffect(() => {
    const persisted = getPersistedDraft(tenantId, scope);
    if (!persisted || !persisted.blocks || persisted.blocks.length === 0) {
      setState(null);
      return;
    }

    const now = Date.now();
    const draftAge = persisted.savedAt ? now - persisted.savedAt : null;

    setState({
      isDraft: true,
      draftAge,
      onRestore: () => {
        load(persisted.blocks);
      },
      onDiscard: () => {
        setState(null);
      },
    });
  }, [tenantId, scope, load]);

  return state;
}
