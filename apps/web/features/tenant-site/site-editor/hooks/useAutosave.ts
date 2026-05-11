/**
 * Debounced autosave of layout drafts.
 *
 * Behaviour:
 *   - Dirty transitions false→true start a 2s debounced save.
 *   - On success: `markClean()` runs *after* the mutation resolves so
 *     the editor's clean flag truly reflects the persisted value.
 *   - On failure: dirty stays true and the next user edit (or a
 *     follow-up dirty transition) retries the save. The mutation hook
 *     already toasts the error — we don't double-toast here, but we do
 *     leave the loop ready to retry naturally instead of silently
 *     swallowing the failure.
 *
 * Previously `markClean()` fired synchronously after `saveDraft(blocks)`
 * (fire-and-forget mutate, not mutateAsync), so a failed save left the
 * editor with a clean flag but unpersisted blocks — the user thought
 * their changes shipped when they hadn't.
 */

import { useEffect, useRef } from "react";
import { useEditorStore } from "../store/editor-store";
import { selectDirty, selectBlocks } from "../store/selectors";
import { useSaveLayoutDraft } from "./useSiteLayoutMutations";
import type { SiteLayoutScope } from "@repo/shared";

const AUTOSAVE_DELAY_MS = 2000;

export function useAutosave(
  scope: SiteLayoutScope,
  pageId: string | null = null,
) {
  const dirty = useEditorStore(selectDirty);
  const blocks = useEditorStore(selectBlocks);
  const { mutateAsync: saveDraft } = useSaveLayoutDraft(scope, pageId);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!dirty) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      timeoutRef.current = null;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await saveDraft(blocks);
        // Only mark clean once the server has accepted the write — if
        // the user edited mid-flight (dirty went false→true→false),
        // the store's setter will have set dirty=true again; markClean()
        // here clears the bit we just persisted, leaving the new edits
        // dirty for the next debounce cycle.
        useEditorStore.getState().markClean();
      } catch {
        // Mutation hook already toasted the failure; leave dirty=true
        // so the next user edit retries the save naturally.
      } finally {
        inFlightRef.current = false;
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [dirty, blocks, saveDraft]);
}
