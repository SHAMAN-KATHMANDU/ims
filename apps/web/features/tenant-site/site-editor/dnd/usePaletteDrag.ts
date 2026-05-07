/**
 * Drag handler for palette block tiles.
 * Initiates a DnD session with the new block as a ghost.
 */

import { useCallback } from "react";
import type { BlockNode } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import {
  selectInsertSiblingOf,
  selectInsertChildOf,
  selectSelectedId,
} from "../store/selectors";
import { CONTAINER_KINDS } from "../tree/containerKinds";

export function usePaletteDrag() {
  const insertSiblingOf = useEditorStore(selectInsertSiblingOf);
  const insertChildOf = useEditorStore(selectInsertChildOf);
  const selectedId = useEditorStore(selectSelectedId);

  const handleDragStart = useCallback(
    (e: React.DragEvent, block: BlockNode) => {
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("application/json", JSON.stringify(block));

      // Store metadata for drop zone resolution
      (e.dataTransfer as any).__siteEditorMetadata = {
        source: "palette",
        blockKind: block.kind,
      };
    },
    [],
  );

  const handleDropPalette = useCallback(
    (
      block: BlockNode,
      targetId: string,
      zone: "before" | "after" | "inside",
    ) => {
      if (!selectedId && zone !== "inside") {
        // No anchor selected, append to root
        useEditorStore.getState().addBlock(block);
        return;
      }

      if (zone === "inside" && CONTAINER_KINDS.includes(block.kind as any)) {
        insertChildOf(targetId, block);
      } else if (zone === "before" || zone === "after") {
        insertSiblingOf(
          targetId,
          zone === "before" ? "before" : "after",
          block,
        );
      }
    },
    [selectedId, insertSiblingOf, insertChildOf],
  );

  return { handleDragStart, handleDropPalette };
}
