"use client";

import { useState, useRef } from "react";
import {
  GripVertical,
  Copy,
  MoreVertical,
  Trash2,
  Plus as PlusIcon,
} from "lucide-react";
import type { BlockNode, BlockKind } from "@repo/shared";
import { BLOCK_CATALOG_ENTRIES } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import {
  selectBlocks,
  selectMoveBlockToPath,
  selectInsertSiblingOf,
  selectInsertChildOf,
  selectWrapInRowAt,
} from "../store/selectors";
import { findPath } from "../tree/blockTree";
import { isContainerKind, CONTAINER_KINDS } from "../tree/containerKinds";
import { resolveDropZone } from "../dnd/dropZones";
import { DropIndicator } from "./DropIndicator";
import type { DropZone } from "../dnd/dropZones";
import { BlockView } from "./BlockView";

interface BlockWrapProps {
  block: BlockNode;
  index: number;
  isSelected: boolean;
}

interface HoverZone {
  zone: DropZone;
  rect: { x: number; y: number; width: number; height: number };
}

export function BlockWrap({ block, index, isSelected }: BlockWrapProps) {
  const [hoverZone, setHoverZone] = useState<HoverZone | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const blocks = useEditorStore(selectBlocks);
  const moveBlockToPath = useEditorStore(selectMoveBlockToPath);
  const insertSiblingOf = useEditorStore(selectInsertSiblingOf);
  const insertChildOf = useEditorStore(selectInsertChildOf);
  const wrapInRowAt = useEditorStore(selectWrapInRowAt);
  const { setSelected, removeBlock, duplicateBlock, addBlock } =
    useEditorStore();

  const handleSelect = () => {
    setSelected(block.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeBlock(block.id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateBlock(block.id);
  };

  const handleAddBelow = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Create a new rich-text block below this one
    const entry = BLOCK_CATALOG_ENTRIES.find((e) => e.kind === "rich-text");
    const props = entry?.createDefaultProps() ?? { source: "" };
    const newBlock: BlockNode = {
      id: `block-${crypto.randomUUID().slice(0, 8)}`,
      kind: "rich-text",
      props,
    };
    addBlock(newBlock, index + 1);
  };

  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("application/x-block-id", block.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const result = resolveDropZone({
      pointerX: e.clientX,
      pointerY: e.clientY,
      targetRect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      isContainer: isContainerKind(block.kind as BlockKind),
    });
    setHoverZone({ zone: result.zone, rect: result.rect });
  };

  const onDragLeave = () => {
    setHoverZone(null);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHoverZone(null);
    if (!hoverZone) return;

    const draggedId = e.dataTransfer.getData("application/x-block-id");
    const paletteKind = e.dataTransfer.getData("application/x-block-kind") as
      | BlockKind
      | "";

    if (draggedId && draggedId !== block.id) {
      // Moving an existing block
      const fromPath = findPath(blocks, draggedId);
      if (!fromPath) return;

      if (hoverZone.zone === "top" || hoverZone.zone === "bottom") {
        const targetPath = findPath(blocks, block.id);
        if (!targetPath) return;
        const idx = targetPath[targetPath.length - 1]!;
        const newSlot = hoverZone.zone === "top" ? idx : idx + 1;
        const toPath = [...targetPath.slice(0, -1), newSlot];
        moveBlockToPath(fromPath, toPath);
      } else if (hoverZone.zone === "inside") {
        const targetPath = findPath(blocks, block.id);
        if (!targetPath) return;
        moveBlockToPath(fromPath, [...targetPath, 0]);
      }
      // left/right: skip for existing blocks to keep semantics simple
    } else if (paletteKind) {
      // Inserting a new block from palette
      const entry = BLOCK_CATALOG_ENTRIES.find(
        (ent) => ent.kind === paletteKind,
      );
      if (!entry) return;
      const newBlock: BlockNode = {
        id: `block-${crypto.randomUUID().slice(0, 8)}`,
        kind: paletteKind,
        props: entry.createDefaultProps(),
      };
      if (hoverZone.zone === "top") {
        insertSiblingOf(block.id, "before", newBlock);
      } else if (hoverZone.zone === "bottom") {
        insertSiblingOf(block.id, "after", newBlock);
      } else if (hoverZone.zone === "inside") {
        insertChildOf(block.id, newBlock);
      } else if (hoverZone.zone === "left" || hoverZone.zone === "right") {
        wrapInRowAt(block.id, hoverZone.zone, newBlock);
      }
    }
  };

  return (
    <div
      ref={wrapRef}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={handleSelect}
      className={`
        relative p-1 rounded transition-colors
        ${
          isSelected
            ? "bg-[color:oklch(from_var(--accent)_l_c_h_/_0.05)] ring-1"
            : "hover:bg-[var(--bg-sunken)]"
        }
      `}
      style={{
        margin: "1px -16px",
        padding: "1px 16px",
        backgroundColor: isSelected
          ? "oklch(from var(--accent) l c h / 0.05)"
          : "transparent",
        boxShadow: isSelected ? `inset 0 0 0 1.5px var(--accent)` : "none",
        transition: "background-color 80ms",
      }}
    >
      <DropIndicator
        zone={hoverZone?.zone ?? "inside"}
        rect={hoverZone?.rect ?? { x: 0, y: 0, width: 0, height: 0 }}
        isVisible={hoverZone !== null}
      />
      {/* Left hover handles */}
      <div
        className="absolute -left-8 top-1.5 flex gap-0.5"
        style={{
          opacity: isSelected ? 1 : 0,
          transition: "opacity 100ms",
        }}
      >
        <button
          onClick={handleAddBelow}
          className="w-5.5 h-5.5 rounded flex items-center justify-center"
          style={{
            backgroundColor: "transparent",
            color: "var(--ink-4)",
          }}
          title="Add block below"
        >
          <PlusIcon size={12} />
        </button>
        <button
          draggable
          className="w-5.5 h-5.5 rounded flex items-center justify-center cursor-grab"
          style={{
            backgroundColor: "transparent",
            color: "var(--ink-4)",
          }}
          title="Drag to reorder"
        >
          <GripVertical size={12} />
        </button>
      </div>

      {/* Block content */}
      <BlockView block={block} />

      {/* Right toolbar when selected */}
      {isSelected && (
        <div
          className="absolute -right-12 -top-2 flex gap-0.5 p-0.5 rounded"
          style={{
            backgroundColor: "var(--bg-elev)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow-md)",
            zIndex: 10,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDuplicate}
            className="w-5.5 h-5.5 rounded flex items-center justify-center"
            style={{
              color: "var(--ink-3)",
            }}
            title="Duplicate"
          >
            <Copy size={12} />
          </button>
          <button
            className="w-5.5 h-5.5 rounded flex items-center justify-center"
            style={{
              color: "var(--ink-3)",
            }}
            title="More options"
          >
            <MoreVertical size={12} />
          </button>
          <div
            style={{
              width: "1px",
              backgroundColor: "var(--line)",
              margin: "2px 0",
            }}
          />
          <button
            onClick={handleDelete}
            className="w-5.5 h-5.5 rounded flex items-center justify-center"
            style={{
              color: "var(--danger)",
            }}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
