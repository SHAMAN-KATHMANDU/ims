"use client";

/**
 * BlockTreePanel — left pane of the editor.
 *
 * Lists the blocks in the current scope with up/down/delete/select.
 * Opening the palette is handled by the parent so this component stays
 * focused on the tree itself.
 */

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BlockNode } from "@repo/shared";
import { useEditorStore, selectBlocks, selectSelectedId } from "./editor-store";
import { getCatalogEntry } from "./block-catalog";

type Props = {
  onOpenPalette: () => void;
};

export function BlockTreePanel({ onOpenPalette }: Props) {
  const blocks = useEditorStore(selectBlocks);
  const selectedId = useEditorStore(selectSelectedId);
  const setSelected = useEditorStore((s) => s.setSelected);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold">Blocks</h3>
        <Button size="sm" onClick={onOpenPalette}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {blocks.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No blocks yet. Click <strong>Add</strong> to insert your first one.
          </div>
        ) : (
          <ul className="space-y-1 p-2">
            {blocks.map((block, idx) => (
              <BlockRow
                key={block.id}
                block={block}
                selected={block.id === selectedId}
                canMoveUp={idx > 0}
                canMoveDown={idx < blocks.length - 1}
                onSelect={() => setSelected(block.id)}
                onMoveUp={() => moveBlock(block.id, -1)}
                onMoveDown={() => moveBlock(block.id, 1)}
                onRemove={() => removeBlock(block.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BlockRow({
  block,
  selected,
  canMoveUp,
  canMoveDown,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  block: BlockNode;
  selected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const entry = getCatalogEntry(block.kind);
  const label = entry?.label ?? block.kind;
  return (
    <li
      className={`flex items-center gap-1 rounded-md border px-2 py-1.5 ${
        selected ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 text-left"
      >
        <div className="truncate text-sm font-medium">{label}</div>
        <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
          {block.kind}
        </div>
      </button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={onMoveUp}
        disabled={!canMoveUp}
        aria-label="Move up"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={onMoveDown}
        disabled={!canMoveDown}
        aria-label="Move down"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={onRemove}
        aria-label="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}
