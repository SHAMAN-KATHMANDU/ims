"use client";

/**
 * ContentBlockEditor — vertical, structural CMS body editor.
 *
 * Controlled-input shape: parent owns the canonical `value: BlockNode[]`
 * (typically a React Hook Form field on `BlogPostEditor` /
 * `TenantPageEditor`). On every internal mutation we fire `onChange()`
 * synchronously so the form's dirty + autosave flow stays accurate.
 *
 * Internals: a per-mount Zustand store from `createContentEditorStore()`
 * holds the working tree + undo/redo + selection. The store mirrors the
 * authoritative `value` only at mount time and via `value`-changed
 * cycles (e.g. parent reset). All in-editor mutations flow through the
 * store, then up to the parent.
 *
 * Drag-and-drop reorder uses `@dnd-kit/sortable` (already a dep).
 *
 * Accessibility: each row is a `role="button"` for click + keyboard
 * selection; `cmd+z` / `cmd+shift+z` undo/redo; `delete` removes the
 * selected block.
 */

import { useEffect, useMemo, useRef, useCallback } from "react";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Undo2, Redo2 } from "lucide-react";
import type { BlockNode, CatalogEntry } from "@repo/shared";
import { Button } from "@/components/ui/button";
import {
  createContentEditorStore,
  type ContentEditorStore,
  selectBlocks,
  selectSelectedId,
  selectAddBlock,
  selectRemoveBlock,
  selectMoveBlock,
  selectMoveBlockTo,
  selectDuplicateBlock,
  selectUpdateBlockProps,
  selectSetSelected,
  selectUndo,
  selectRedo,
  selectCanUndo,
  selectCanRedo,
  selectLoad,
} from "../store/content-editor-store";
import { ContentBlockPalette } from "./ContentBlockPalette";
import { ContentBlockRow } from "./ContentBlockRow";

interface Props {
  value: BlockNode[];
  onChange: (next: BlockNode[]) => void;
  disabled?: boolean;
}

function shortId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

function blockFromCatalog(entry: CatalogEntry): BlockNode {
  return {
    id: `${entry.kind}-${shortId()}`,
    kind: entry.kind,
    props: entry.createDefaultProps() as BlockNode["props"],
  };
}

/**
 * Reference-equal check on the BlockNode[] arrays — used to skip
 * onChange echoes when the parent's `value` already matches the store.
 * Matches Zustand's default identity selector behaviour.
 */
function sameRef(a: BlockNode[], b: BlockNode[]): boolean {
  return a === b;
}

export function ContentBlockEditor({ value, onChange, disabled }: Props) {
  // One isolated store per mount. Stable across renders.
  const storeRef = useRef<ContentEditorStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createContentEditorStore();
  }
  const useStore = storeRef.current;

  // Hydrate the store from `value` on mount + when an external reset
  // arrives (parent replaced the array reference, e.g. user cancelled).
  // Subsequent in-editor edits flow store → onChange, never the other
  // direction — we compare references to detect that.
  useEffect(() => {
    const current = useStore.getState().present.blocks;
    if (!sameRef(current, value)) {
      useStore.getState().load(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // store → parent
  const blocks = useStore(selectBlocks);
  const selectedId = useStore(selectSelectedId);
  const addBlock = useStore(selectAddBlock);
  const removeBlock = useStore(selectRemoveBlock);
  const moveBlock = useStore(selectMoveBlock);
  const moveBlockTo = useStore(selectMoveBlockTo);
  const duplicateBlock = useStore(selectDuplicateBlock);
  const updateBlockProps = useStore(selectUpdateBlockProps);
  const setSelected = useStore(selectSetSelected);
  const undo = useStore(selectUndo);
  const redo = useStore(selectRedo);
  const canUndo = useStore(selectCanUndo);
  const canRedo = useStore(selectCanRedo);
  const load = useStore(selectLoad);

  // Echo store changes upward. Skip the very first echo (initial load).
  const lastSentRef = useRef<BlockNode[]>(blocks);
  useEffect(() => {
    if (sameRef(blocks, lastSentRef.current)) return;
    lastSentRef.current = blocks;
    if (!sameRef(blocks, value)) onChange(blocks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const fromId = String(active.id);
      const toId = String(over.id);
      const toIdx = useStore
        .getState()
        .present.blocks.findIndex((b) => b.id === toId);
      if (toIdx < 0) return;
      moveBlockTo(fromId, toIdx);
    },
    [moveBlockTo, useStore],
  );

  const handlePick = useCallback(
    (entry: CatalogEntry, atIndex?: number) => {
      addBlock(blockFromCatalog(entry), atIndex);
    },
    [addBlock],
  );

  // Keyboard: cmd/ctrl+z undo, shift+cmd/ctrl+z redo, delete on selection.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (!isTyping && (e.key === "Delete" || e.key === "Backspace")) {
        if (selectedId) {
          e.preventDefault();
          removeBlock(selectedId);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, undo, redo, removeBlock]);

  // Convenience: load(value) flushes selection — re-derive from store.
  // (no-op effect, included so React doesn't warn about unused hook chain)
  useEffect(() => {
    void load;
  }, [load]);

  const ids = useMemo(() => blocks.map((b) => b.id), [blocks]);

  const empty = blocks.length === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {empty
            ? "No blocks yet — start by adding one below."
            : `${blocks.length} block${blocks.length === 1 ? "" : "s"}`}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => undo()}
            disabled={!canUndo || disabled}
            aria-label="Undo"
            title="Undo (⌘Z)"
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => redo()}
            disabled={!canRedo || disabled}
            aria-label="Redo"
            title="Redo (⇧⌘Z)"
          >
            <Redo2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {blocks.map((block, idx) => (
              <div key={block.id}>
                <ContentBlockRow
                  block={block}
                  selected={block.id === selectedId}
                  disabled={disabled}
                  onSelect={setSelected}
                  onChangeProps={
                    updateBlockProps as (
                      id: string,
                      props: BlockNode["props"],
                    ) => void
                  }
                  onMoveUp={(id) => moveBlock(id, -1)}
                  onMoveDown={(id) => moveBlock(id, 1)}
                  onDuplicate={duplicateBlock}
                  onDelete={removeBlock}
                />
                <div className="flex justify-center py-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <ContentBlockPalette
                    label="Add block here"
                    compact
                    disabled={disabled}
                    onPick={(entry) => handlePick(entry, idx + 1)}
                  />
                </div>
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex justify-center pt-2">
        <ContentBlockPalette
          label={empty ? "Add your first block" : "Add block"}
          disabled={disabled}
          onPick={(entry) => handlePick(entry)}
        />
      </div>
    </div>
  );
}
