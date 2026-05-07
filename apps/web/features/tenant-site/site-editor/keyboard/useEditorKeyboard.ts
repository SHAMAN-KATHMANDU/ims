/**
 * Editor keyboard shortcuts handler.
 * Wires common editing actions to the editor store.
 */

import { useEffect, useCallback } from "react";
import { useEditorStore } from "../store/editor-store";
import {
  selectUndo,
  selectRedo,
  selectSelectedId,
  selectMoveBlock,
  selectRemoveBlock,
  selectDuplicateBlock,
} from "../store/selectors";

interface UseEditorKeyboardOptions {
  enabled?: boolean;
  onSlashMenu?: (anchorId: string) => void;
}

export function useEditorKeyboard(options: UseEditorKeyboardOptions = {}) {
  const { enabled = true, onSlashMenu: _onSlashMenu } = options;

  const undo = useEditorStore(selectUndo);
  const redo = useEditorStore(selectRedo);
  const selectedId = useEditorStore(selectSelectedId);
  const moveBlock = useEditorStore(selectMoveBlock);
  const removeBlock = useEditorStore(selectRemoveBlock);
  const duplicateBlock = useEditorStore(selectDuplicateBlock);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // ⌘Z — Undo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // ⌘⇧Z — Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }

      // Esc — Deselect
      if (e.key === "Escape") {
        const store = useEditorStore.getState();
        store.setSelected(null);
        return;
      }

      if (!selectedId) return;

      // Delete — Delete selected
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeBlock(selectedId);
        return;
      }

      // ⌘D — Duplicate selected
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        duplicateBlock(selectedId);
        return;
      }

      // ↑ / ↓ — Move up / down in sibling order
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveBlock(selectedId, -1);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveBlock(selectedId, 1);
        return;
      }

      // ⌘1 / ⌘2 / ⌘3 — Device toggle (dispatched to parent, not handled here)
      if ((e.metaKey || e.ctrlKey) && ["1", "2", "3"].includes(e.key)) {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent("editor:device-switch", { detail: { key: e.key } }),
        );
        return;
      }
    },
    [enabled, selectedId, undo, redo, removeBlock, moveBlock, duplicateBlock],
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}
