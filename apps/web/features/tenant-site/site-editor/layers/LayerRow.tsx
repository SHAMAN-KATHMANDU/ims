"use client";

import { GripVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import type { BlockNode } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import {
  selectSetSelected,
  selectRemoveBlock,
  selectMoveBlockToPath,
} from "../store/selectors";
import { findPath } from "../tree/blockTree";
import { getBlockLabel, getBlockIcon } from "./blockLabels";

interface LayerRowProps {
  block: BlockNode;
  index: number;
  isSelected: boolean;
  depth: number;
}

export function LayerRow({ block, index, isSelected, depth }: LayerRowProps) {
  const [dragOverPosition, setDragOverPosition] = useState<
    "above" | "below" | null
  >(null);
  const setSelected = useEditorStore(selectSetSelected);
  const removeBlock = useEditorStore(selectRemoveBlock);
  const moveBlockToPath = useEditorStore(selectMoveBlockToPath);
  const selectBlocks = (s: any) => s.present.blocks; // eslint-disable-line @typescript-eslint/no-explicit-any
  const blocks = useEditorStore(selectBlocks);

  const handleSelect = () => {
    setSelected(block.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeBlock(block.id);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-block-id", block.id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const position = y < rect.height / 2 ? "above" : "below";
    setDragOverPosition(position);
  };

  const handleDragLeave = () => {
    setDragOverPosition(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverPosition(null);
    const draggedId = e.dataTransfer.getData("application/x-block-id");
    if (!draggedId) return;

    const fromPath = findPath(blocks, draggedId);
    const toPath = findPath(blocks, block.id);
    if (!fromPath || !toPath) return;

    // Adjust target path based on drop position
    const targetPath = [...toPath];
    if (
      dragOverPosition === "below" &&
      toPath[toPath.length - 1] !== undefined
    ) {
      targetPath[targetPath.length - 1]! += 1;
    }

    moveBlockToPath(fromPath, targetPath);
  };

  const paddingLeft = `${depth * 16 + 8}px`;

  return (
    <div
      draggable
      onClick={handleSelect}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleSelect();
        }
      }}
      role="button"
      tabIndex={0}
      className={`
        flex items-center gap-2 px-2 py-1.5 mx-1 rounded cursor-grab relative
        ${
          isSelected ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-sunken)]"
        }
        ${dragOverPosition ? "border-t-2 border-b-2 border-blue-500" : ""}
      `}
      style={{
        paddingLeft,
        color: isSelected ? "var(--accent)" : "var(--ink-2)",
        backgroundColor: isSelected ? "var(--accent-soft)" : "transparent",
        borderTopColor:
          dragOverPosition === "above" ? "rgb(59 130 246)" : "transparent",
        borderBottomColor:
          dragOverPosition === "below" ? "rgb(59 130 246)" : "transparent",
      }}
    >
      <GripVertical
        size={11}
        className="flex-shrink-0"
        style={{ color: "var(--ink-5)" }}
      />

      <div
        className="w-3 h-3 rounded flex-shrink-0"
        style={{
          backgroundColor: "var(--bg-sunken)",
          color: isSelected ? "var(--accent)" : "var(--ink-4)",
        }}
        title={block.kind}
      >
        {/* Icon placeholder */}
        <span className="text-xs" style={{ visibility: "hidden" }}>
          {getBlockIcon(block.kind)}
        </span>
      </div>

      <span className="flex-1 text-xs truncate font-medium">
        {getBlockLabel(block)}
      </span>

      <span
        className="text-xs font-mono flex-shrink-0"
        style={{ color: "var(--ink-5)" }}
      >
        {index + 1}
      </span>

      <button
        onClick={handleDelete}
        className="w-4 h-4 rounded opacity-0 flex items-center justify-center hover:text-[var(--danger)]"
        style={{
          color: "var(--ink-4)",
        }}
        title="Delete block"
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
}
