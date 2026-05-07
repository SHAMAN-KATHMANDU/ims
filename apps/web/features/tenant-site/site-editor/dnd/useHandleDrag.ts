/**
 * Drag handler for block hover handles (⋮⋮).
 * Moves the dragged block within the tree structure.
 */

import { useCallback, useState } from "react";
import { useEditorStore } from "../store/editor-store";
import {
  selectMoveBlockToPath,
  selectBlocks,
  selectWrapInRowAt,
} from "../store/selectors";
import { findPath } from "../tree/blockTree";
import type { DropZone } from "../canvas/PreviewMessageBus";

export function useHandleDrag() {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const moveBlockToPath = useEditorStore(selectMoveBlockToPath);
  const wrapInRowAt = useEditorStore(selectWrapInRowAt);
  const blocks = useEditorStore(selectBlocks);

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  const handleDropHandle = useCallback(
    (targetId: string, zone: DropZone) => {
      if (!draggedId) return;

      const fromPath = findPath(blocks, draggedId);
      if (!fromPath) return;

      if (zone === "inside") {
        // Move into target as a child
        const toPath = findPath(blocks, targetId);
        if (toPath) {
          moveBlockToPath(fromPath, [
            ...toPath,
            (blocks[toPath[0]!]?.children?.length ?? 0) + 1,
          ]);
        }
      } else if (zone === "top" || zone === "bottom") {
        // Move before/after target
        const toPath = findPath(blocks, targetId);
        if (toPath) {
          const slot = toPath[toPath.length - 1]!;
          const parentPath = toPath.slice(0, -1);
          const newSlot = zone === "top" ? slot : slot + 1;
          moveBlockToPath(fromPath, [...parentPath, newSlot]);
        }
      } else if (zone === "left" || zone === "right") {
        // Wrap in row
        wrapInRowAt(targetId, zone === "left" ? "left" : "right", {
          id: draggedId,
          kind: "row",
          props: {},
        });
      }

      setDraggedId(null);
    },
    [draggedId, blocks, moveBlockToPath, wrapInRowAt],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
  }, []);

  return { draggedId, handleDragStart, handleDropHandle, handleDragEnd };
}
