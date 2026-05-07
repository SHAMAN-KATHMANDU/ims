/**
 * Floating toolbar above selected block.
 * Offers quick actions: move up/down, duplicate, delete, convert kind.
 */

import React from "react";
import { ArrowUp, ArrowDown, Copy, Trash2, ChevronDown } from "lucide-react";
import { useEditorStore } from "../store/editor-store";
import {
  selectMoveBlock,
  selectDuplicateBlock,
  selectRemoveBlock,
} from "../store/selectors";

interface BlockSelectionToolbarProps {
  id: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const BlockSelectionToolbar = React.forwardRef<
  HTMLDivElement,
  BlockSelectionToolbarProps
>(({ id, rect }, ref) => {
  const moveBlock = useEditorStore(selectMoveBlock);
  const duplicateBlock = useEditorStore(selectDuplicateBlock);
  const removeBlock = useEditorStore(selectRemoveBlock);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: rect.y - 48,
        left: rect.x + rect.width / 2 - 100,
        zIndex: 998,
      }}
      className="flex gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1"
    >
      <button
        onClick={() => moveBlock(id, -1)}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Move up"
      >
        <ArrowUp className="w-4 h-4 text-gray-600" />
      </button>

      <button
        onClick={() => moveBlock(id, 1)}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Move down"
      >
        <ArrowDown className="w-4 h-4 text-gray-600" />
      </button>

      <div className="w-px bg-gray-200" />

      <button
        onClick={() => duplicateBlock(id)}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Duplicate"
      >
        <Copy className="w-4 h-4 text-gray-600" />
      </button>

      <button
        onClick={() => removeBlock(id)}
        className="p-2 hover:bg-red-50 rounded transition-colors"
        title="Delete"
      >
        <Trash2 className="w-4 h-4 text-red-600" />
      </button>

      <div className="w-px bg-gray-200" />

      <button
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="More options"
      >
        <ChevronDown className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  );
});

BlockSelectionToolbar.displayName = "BlockSelectionToolbar";
