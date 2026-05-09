"use client";

import { GripVertical, Trash2 } from "lucide-react";
import type { BlockNode } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import { getBlockLabel, getBlockIcon } from "./blockLabels";

interface LayerRowProps {
  block: BlockNode;
  index: number;
  isSelected: boolean;
  depth: number;
}

export function LayerRow({ block, index, isSelected, depth }: LayerRowProps) {
  const { setSelected, removeBlock } = useEditorStore();

  const handleSelect = () => {
    setSelected(block.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeBlock(block.id);
  };

  const paddingLeft = `${depth * 16 + 8}px`;

  return (
    <div
      draggable
      onClick={handleSelect}
      className={`
        flex items-center gap-2 px-2 py-1.5 mx-1 rounded cursor-grab
        ${
          isSelected ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-sunken)]"
        }
      `}
      style={{
        paddingLeft,
        color: isSelected ? "var(--accent)" : "var(--ink-2)",
        backgroundColor: isSelected ? "var(--accent-soft)" : "transparent",
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
