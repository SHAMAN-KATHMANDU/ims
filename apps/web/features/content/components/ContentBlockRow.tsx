"use client";

/**
 * ContentBlockRow — one row in the ContentBlockEditor's vertical list.
 *
 * Holds: drag handle, kind label, hover toolbar (move up / move down /
 * duplicate / delete), and the inline editor for the block's kind.
 * Selection is purely visual — the row is "selected" when the user
 * clicks anywhere inside it; this drives the kbd shortcuts in the parent.
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  MoreVertical,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { BlockNode } from "@repo/shared";
import { BLOCK_CATALOG_ENTRIES } from "@repo/shared";
import { pickInlineEditor } from "./inline-editors";

interface Props {
  block: BlockNode;
  selected: boolean;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onChangeProps: (id: string, props: BlockNode["props"]) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ContentBlockRow({
  block,
  selected,
  disabled,
  onSelect,
  onChangeProps,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const catalogEntry = BLOCK_CATALOG_ENTRIES.find((e) => e.kind === block.kind);
  const label = catalogEntry?.label ?? block.kind;
  const Inline = pickInlineEditor(block.kind);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-md border bg-card transition-colors ${
        selected ? "border-primary/60" : "border-border hover:border-border/80"
      } ${isDragging ? "z-10 shadow-lg" : ""}`}
      onClick={() => onSelect(block.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(block.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${label} block`}
    >
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            {...attributes}
            {...listeners}
            disabled={disabled}
            className="flex h-6 w-5 items-center justify-center text-muted-foreground/60 hover:text-muted-foreground cursor-grab active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 disabled:opacity-40 opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Block actions"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3.5 w-3.5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onMoveUp(block.id)}>
              <ArrowUp className="mr-2 h-4 w-4" aria-hidden="true" />
              Move up
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onMoveDown(block.id)}>
              <ArrowDown className="mr-2 h-4 w-4" aria-hidden="true" />
              Move down
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDuplicate(block.id)}>
              <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onDelete(block.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <Inline
          blockId={block.id}
          props={block.props as unknown}
          onChange={(next) =>
            onChangeProps(block.id, next as BlockNode["props"])
          }
          disabled={disabled}
        />
      </div>
    </div>
  );
}
