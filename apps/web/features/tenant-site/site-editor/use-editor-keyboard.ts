"use client";

/**
 * use-editor-keyboard — Notion-style keyboard shortcuts for the site editor.
 *
 * Bindings (gated by EnvFeature.NOTION_STYLE_EDITOR — caller is responsible
 * for mounting / not mounting based on the flag):
 *
 *   ⌘↑ / ⌘↓ : move the selected block up / down by one slot in its parent
 *             (any depth).
 *   ⌫        : remove the selected block. Selection moves to the previous
 *             sibling, or null if it was the first child.
 *   ↑ / ↓    : move selection between siblings of the selected block.
 *
 * The "/" slash-menu trigger lives in SlashMenu.tsx so it can manage its
 * own open/close state.
 *
 * All bindings short-circuit when an input / textarea / contentEditable
 * element has focus, so they never fight inline editing.
 */

import { useEffect } from "react";
import {
  selectBlocks,
  selectMoveBlock,
  selectRemoveBlock,
  selectSelectedId,
  selectSetSelected,
  useEditorStore,
} from "./editor-store";
import { findPath, nodeAt } from "@/lib/block-tree";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useEditorKeyboard(enabled: boolean): void {
  const blocks = useEditorStore(selectBlocks);
  const selectedId = useEditorStore(selectSelectedId);
  const moveBlock = useEditorStore(selectMoveBlock);
  const removeBlock = useEditorStore(selectRemoveBlock);
  const setSelected = useEditorStore(selectSetSelected);

  useEffect(() => {
    if (!enabled) return;

    function handler(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (!selectedId) return;

      const path = findPath(blocks, selectedId);
      if (!path) return;
      const slot = path[path.length - 1]!;
      const parentPath = path.slice(0, -1);
      const siblings =
        parentPath.length === 0
          ? blocks
          : (nodeAt(blocks, parentPath)?.children ?? []);

      const cmd = e.metaKey || e.ctrlKey;

      // ⌘↑ / ⌘↓ — move selected block one slot up / down within its parent.
      if (cmd && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const delta = e.key === "ArrowUp" ? -1 : 1;
        if (delta === -1 && slot === 0) return;
        if (delta === 1 && slot >= siblings.length - 1) return;
        moveBlock(selectedId, delta);
        return;
      }

      // ⌫ — delete selected block.
      if (!cmd && (e.key === "Backspace" || e.key === "Delete")) {
        e.preventDefault();
        // Pick a successor BEFORE removal so the selection lands somewhere
        // sensible — previous sibling, then next sibling, else parent (or null).
        const successor =
          siblings[slot - 1]?.id ??
          siblings[slot + 1]?.id ??
          (parentPath.length > 0
            ? (nodeAt(blocks, parentPath)?.id ?? null)
            : null);
        removeBlock(selectedId);
        setSelected(successor);
        return;
      }

      // ↑ / ↓ — selection navigation between siblings.
      if (!cmd && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const targetSlot = e.key === "ArrowUp" ? slot - 1 : slot + 1;
        if (targetSlot < 0 || targetSlot >= siblings.length) return;
        const target = siblings[targetSlot]!;
        setSelected(target.id);
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, blocks, selectedId, moveBlock, removeBlock, setSelected]);
}
