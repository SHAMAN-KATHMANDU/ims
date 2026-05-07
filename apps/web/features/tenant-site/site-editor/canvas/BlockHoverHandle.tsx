/**
 * Notion-style hover handle (⋮⋮) for block operations.
 * Rendered via portal at the top-left of hovered block.
 */

import React, { useState } from "react";
import { GripVertical, Copy, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useEditorStore } from "../store/editor-store";
import {
  selectDuplicateBlock,
  selectRemoveBlock,
  selectMoveBlock,
} from "../store/selectors";

interface BlockHoverHandleProps {
  id: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  onDragStart?: (e: React.MouseEvent) => void;
  isVisible: boolean;
}

export const BlockHoverHandle = React.forwardRef<
  HTMLDivElement,
  BlockHoverHandleProps
>(({ id, rect, onDragStart, isVisible }, ref) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const duplicateBlock = useEditorStore(selectDuplicateBlock);
  const removeBlock = useEditorStore(selectRemoveBlock);
  const moveBlock = useEditorStore(selectMoveBlock);

  if (!isVisible) return null;

  const handleDuplicate = () => {
    duplicateBlock(id);
    setIsMenuOpen(false);
  };

  const handleDelete = () => {
    removeBlock(id);
    setIsMenuOpen(false);
  };

  const handleMoveUp = () => {
    moveBlock(id, -1);
    setIsMenuOpen(false);
  };

  const handleMoveDown = () => {
    moveBlock(id, 1);
    setIsMenuOpen(false);
  };

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: rect.y - 8,
        left: rect.x - 8,
        zIndex: 999,
        display: "flex",
        gap: "8px",
      }}
      className="group"
    >
      {/* Drag handle */}
      <button
        onMouseDown={onDragStart}
        className="p-1 rounded hover:bg-gray-200 cursor-grab active:cursor-grabbing transition-colors"
        title="Drag to move"
      >
        <GripVertical className="w-4 h-4 text-gray-600" />
      </button>

      {/* Action menu */}
      <div className="relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1 rounded hover:bg-gray-200 transition-colors"
          title="More actions"
        >
          <span className="text-gray-600 font-bold">⋮⋮</span>
        </button>

        {isMenuOpen && (
          <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded shadow-lg z-1000 min-w-max">
            <button
              onClick={handleMoveUp}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
            >
              <ArrowUp className="w-4 h-4" /> Move up
            </button>
            <button
              onClick={handleMoveDown}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
            >
              <ArrowDown className="w-4 h-4" /> Move down
            </button>
            <div className="border-t border-gray-200" />
            <button
              onClick={handleDuplicate}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
            >
              <Copy className="w-4 h-4" /> Duplicate
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-sm text-red-600"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

BlockHoverHandle.displayName = "BlockHoverHandle";
