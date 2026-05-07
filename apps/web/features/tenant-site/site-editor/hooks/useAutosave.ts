/**
 * Debounced autosave of layout drafts.
 * Fires when dirty flag transitions from false→true and settles.
 */

import { useEffect, useRef } from "react";
import { useEditorStore } from "../store/editor-store";
import { selectDirty, selectBlocks } from "../store/selectors";
import { useSaveLayoutDraft } from "./useSiteLayoutMutations";
import type { SiteLayoutScope } from "@repo/shared";

const AUTOSAVE_DELAY_MS = 2000;

export function useAutosave(scope: SiteLayoutScope) {
  const dirty = useEditorStore(selectDirty);
  const blocks = useEditorStore(selectBlocks);
  const { mutate: saveDraft } = useSaveLayoutDraft(scope);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSavedRef = useRef(false);

  useEffect(() => {
    if (!dirty) {
      hasSavedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (!hasSavedRef.current) {
        saveDraft(blocks);
        useEditorStore.getState().markClean();
        hasSavedRef.current = true;
      }
      timeoutRef.current = null;
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [dirty, blocks, saveDraft]);
}
