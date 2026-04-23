"use client";

import {
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Box,
  MoreHorizontal,
  X,
} from "lucide-react";
import type { BlockNode } from "@repo/shared";
import { cn } from "@/lib/utils";
import { useEditorStore } from "./editor-store";
import { BLOCK_CATALOG } from "./block-catalog";

export function BlockActionToolbar({
  blocks,
  selectedId,
  onOpenMenu,
}: {
  blocks: BlockNode[];
  selectedId: string | null;
  onOpenMenu: (blockId: string, x: number, y: number) => void;
}) {
  const setSelected = useEditorStore((s) => s.setSelected);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);

  if (!selectedId) return null;
  const idx = blocks.findIndex((b) => b.id === selectedId);
  if (idx < 0) return null;
  const block = blocks[idx]!;
  const entry = BLOCK_CATALOG.find((c) => c.kind === block.kind);
  const canMoveUp = idx > 0;
  const canMoveDown = idx < blocks.length - 1;

  return (
    <div
      className="sticky top-3 z-20 mx-auto w-fit animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card/95 backdrop-blur px-1 py-1 shadow-lg">
        <div className="px-2 py-0.5 flex items-center gap-1.5 text-[11.5px] font-medium text-foreground">
          <Box size={11} className="text-muted-foreground/70" />
          {entry?.label ?? block.kind}
        </div>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          onClick={() => moveBlock(selectedId, -1)}
          disabled={!canMoveUp}
          title="Move up"
          className={cn(
            "h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors",
          )}
        >
          <ChevronUp size={13} />
        </button>
        <button
          onClick={() => moveBlock(selectedId, 1)}
          disabled={!canMoveDown}
          title="Move down"
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDown size={13} />
        </button>
        <button
          onClick={() => duplicateBlock(selectedId)}
          title="Duplicate (⌘D)"
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Copy size={12} />
        </button>
        <button
          onClick={() => removeBlock(selectedId)}
          title="Delete (⌫)"
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <Trash2 size={12} />
        </button>
        <button
          onClick={(e) => {
            const rect = (
              e.currentTarget as HTMLElement
            ).getBoundingClientRect();
            onOpenMenu(selectedId, rect.left, rect.bottom + 4);
          }}
          title="More actions"
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <MoreHorizontal size={13} />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          onClick={() => setSelected(null)}
          title="Deselect (Esc)"
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
