"use client";

/**
 * BlockTreePanel — left pane of the editor.
 *
 * Renders a nested tree of blocks with:
 * - Drag-and-drop reorder via @dnd-kit/sortable (top-level)
 * - Indentation for children of container blocks
 * - Collapse/expand toggles for containers
 * - GripVertical drag handle + delete button per row
 * - "(hidden)" badge for device visibility overrides
 * - Child count badge for containers
 */

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BlockNode } from "@repo/shared";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEditorStore, selectBlocks, selectSelectedId } from "./editor-store";
import { getCatalogEntry } from "./block-catalog";

type Props = {
  onOpenPalette: () => void;
};

const CONTAINER_KINDS = new Set(["section", "columns", "css-grid"]);

export function BlockTreePanel({ onOpenPalette }: Props) {
  const blocks = useEditorStore(selectBlocks);
  const selectedId = useEditorStore(selectSelectedId);
  const setSelected = useEditorStore((s) => s.setSelected);
  const moveBlockTo = useEditorStore((s) => s.moveBlockTo);
  const removeBlock = useEditorStore((s) => s.removeBlock);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      moveBlockTo(String(active.id), newIndex);
    }
  };

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-0.5 p-2">
                {blocks.map((block) => (
                  <TreeNode
                    key={block.id}
                    block={block}
                    depth={0}
                    selectedId={selectedId}
                    onSelect={setSelected}
                    onRemove={removeBlock}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function TreeNode({
  block,
  depth,
  selectedId,
  onSelect,
  onRemove,
}: {
  block: BlockNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const isContainer = CONTAINER_KINDS.has(block.kind);
  const hasChildren =
    isContainer && block.children && block.children.length > 0;
  const selected = block.id === selectedId;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const entry = getCatalogEntry(block.kind);
  const label = entry?.label ?? block.kind;
  const isHidden =
    block.visibility?.mobile === false ||
    block.visibility?.tablet === false ||
    block.visibility?.desktop === false;

  return (
    <li ref={setNodeRef} style={style}>
      <div
        className={`flex items-center gap-1 rounded-md border px-2 py-1 ${
          selected
            ? "border-primary bg-primary/5"
            : "border-transparent hover:border-border"
        } ${isDragging ? "z-10 shadow-md" : ""}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isContainer ? (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground"
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        <button
          type="button"
          className="flex h-6 w-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3 w-3" />
        </button>

        <button
          type="button"
          onClick={() => onSelect(block.id)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-1">
            <span className="truncate text-xs font-medium">{label}</span>
            {isContainer && (
              <span className="shrink-0 text-[9px] text-muted-foreground">
                ({block.children?.length ?? 0})
              </span>
            )}
            {isHidden && (
              <span className="shrink-0 text-[9px] text-amber-600">
                (hidden)
              </span>
            )}
          </div>
          <div className="truncate text-[9px] uppercase tracking-wide text-muted-foreground">
            {block.kind}
          </div>
        </button>

        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 shrink-0"
          onClick={() => onRemove(block.id)}
          aria-label="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {hasChildren && !collapsed && (
        <ul className="space-y-0.5">
          {block.children!.map((child) => (
            <TreeNode
              key={child.id}
              block={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
