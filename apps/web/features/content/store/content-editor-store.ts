"use client";

/**
 * Content body editor store — Zustand store with undo/redo for a vertical
 * `BlockNode[]` body (blog post or custom page).
 *
 * Differences from the site-editor's editor-store:
 *   - Flat list, not a nested tree. The CMS body has no row/columns/section
 *     containers — every block is a top-level peer in the array. This keeps
 *     the mutation surface tiny (no path-aware insert / wrapInRow / etc.).
 *   - No iframe / hover-rect coupling. The editor lives in the same DOM as
 *     the surrounding form, so cross-origin postMessage gymnastics aren't
 *     needed.
 *   - Factory pattern (`createContentEditorStore()`) — every editor mount
 *     gets its own isolated store so two open posts in two tabs don't share
 *     state. The site-editor uses a singleton because there's only one
 *     site-editor surface at a time.
 *
 * Mutations match the BlogPost / TenantPage `body: BlockNode[]` column shape.
 * Undo/redo is a 50-snapshot capped past/future stack — same heuristic as
 * the site-editor.
 *
 * Usage:
 *
 *   const useStore = useMemo(() => createContentEditorStore(), []);
 *   const blocks = useStore(selectBlocks);
 *   const addBlock = useStore(selectAddBlock);
 */

import { create, type StoreApi, type UseBoundStore } from "zustand";
import type { BlockKind, BlockNode, BlockPropsMap } from "@repo/shared";

const HISTORY_LIMIT = 50;

interface Snapshot {
  blocks: BlockNode[];
}

export interface ContentEditorState {
  past: Snapshot[];
  present: Snapshot;
  future: Snapshot[];
  /** Selected block id; null when nothing's selected. */
  selectedId: string | null;
  /** True when the present diverges from the last `load()` / `markClean()`. */
  dirty: boolean;

  // ---- lifecycle ----
  load: (blocks: BlockNode[]) => void;
  markClean: () => void;

  // ---- selection ----
  setSelected: (id: string | null) => void;

  // ---- mutations ----
  addBlock: (block: BlockNode, atIndex?: number) => void;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, delta: -1 | 1) => void;
  moveBlockTo: (id: string, toIndex: number) => void;
  duplicateBlock: (id: string) => void;
  updateBlockProps: <K extends BlockKind>(
    id: string,
    props: Partial<BlockPropsMap[K]>,
  ) => void;

  // ---- history ----
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export type ContentEditorStore = UseBoundStore<StoreApi<ContentEditorState>>;

const EMPTY_SNAPSHOT: Snapshot = { blocks: [] };

/**
 * Generate a stable-ish block id. Uses crypto.randomUUID when available,
 * otherwise a Math.random fallback (server-renderable). Always 8 chars.
 */
function shortId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Create an isolated Zustand store for a single content body editor mount.
 *
 * Returned hook is a normal Zustand bound store — use selectors per
 * `frontend-architecture` rule (no inline selectors).
 */
export function createContentEditorStore(): ContentEditorStore {
  return create<ContentEditorState>()((set, get) => {
    function commit(next: Snapshot): void {
      const { past, present } = get();
      const nextPast = [...past, present];
      if (nextPast.length > HISTORY_LIMIT) nextPast.shift();
      set({ past: nextPast, present: next, future: [], dirty: true });
    }

    return {
      past: [],
      present: EMPTY_SNAPSHOT,
      future: [],
      selectedId: null,
      dirty: false,

      load: (blocks) =>
        set({
          past: [],
          present: { blocks: [...blocks] },
          future: [],
          selectedId: null,
          dirty: false,
        }),

      markClean: () => set({ dirty: false }),

      setSelected: (id) => set({ selectedId: id }),

      addBlock: (block, atIndex) => {
        const { present } = get();
        const blocks = [...present.blocks];
        const idx =
          atIndex !== undefined && atIndex >= 0 && atIndex <= blocks.length
            ? atIndex
            : blocks.length;
        blocks.splice(idx, 0, block);
        commit({ blocks });
        set({ selectedId: block.id });
      },

      removeBlock: (id) => {
        const { present, selectedId } = get();
        const idx = present.blocks.findIndex((b) => b.id === id);
        if (idx < 0) return;
        const blocks = [
          ...present.blocks.slice(0, idx),
          ...present.blocks.slice(idx + 1),
        ];
        commit({ blocks });
        if (selectedId === id) set({ selectedId: null });
      },

      moveBlock: (id, delta) => {
        const { present } = get();
        const idx = present.blocks.findIndex((b) => b.id === id);
        if (idx < 0) return;
        const target = idx + delta;
        if (target < 0 || target >= present.blocks.length) return;
        const blocks = [...present.blocks];
        const [node] = blocks.splice(idx, 1);
        blocks.splice(target, 0, node!);
        commit({ blocks });
      },

      moveBlockTo: (id, toIndex) => {
        const { present } = get();
        const idx = present.blocks.findIndex((b) => b.id === id);
        if (idx < 0) return;
        const clamped = Math.max(
          0,
          Math.min(present.blocks.length - 1, toIndex),
        );
        if (clamped === idx) return;
        const blocks = [...present.blocks];
        const [node] = blocks.splice(idx, 1);
        blocks.splice(clamped, 0, node!);
        commit({ blocks });
      },

      duplicateBlock: (id) => {
        const { present } = get();
        const idx = present.blocks.findIndex((b) => b.id === id);
        if (idx < 0) return;
        const original = present.blocks[idx]!;
        const copy: BlockNode = {
          ...original,
          id: `${original.kind}-${shortId()}`,
        };
        const blocks = [
          ...present.blocks.slice(0, idx + 1),
          copy,
          ...present.blocks.slice(idx + 1),
        ];
        commit({ blocks });
        set({ selectedId: copy.id });
      },

      updateBlockProps: (id, propsPatch) => {
        const { present } = get();
        const idx = present.blocks.findIndex((b) => b.id === id);
        if (idx < 0) return;
        const node = present.blocks[idx]!;
        const merged: BlockNode = {
          ...node,
          props: {
            ...(node.props as Record<string, unknown>),
            ...(propsPatch as Record<string, unknown>),
          } as BlockNode["props"],
        };
        const blocks = [
          ...present.blocks.slice(0, idx),
          merged,
          ...present.blocks.slice(idx + 1),
        ];
        commit({ blocks });
      },

      undo: () => {
        const { past, present, future } = get();
        if (past.length === 0) return;
        const previous = past[past.length - 1]!;
        const nextPast = past.slice(0, -1);
        const nextFuture = [present, ...future];
        if (nextFuture.length > HISTORY_LIMIT) nextFuture.pop();
        set({
          past: nextPast,
          present: previous,
          future: nextFuture,
          dirty: true,
        });
      },

      redo: () => {
        const { past, present, future } = get();
        if (future.length === 0) return;
        const next = future[0]!;
        const nextFuture = future.slice(1);
        const nextPast = [...past, present];
        if (nextPast.length > HISTORY_LIMIT) nextPast.shift();
        set({
          past: nextPast,
          present: next,
          future: nextFuture,
          dirty: true,
        });
      },

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Named selectors (per frontend-architecture: no inline selectors)
// ---------------------------------------------------------------------------

export const selectBlocks = (s: ContentEditorState): BlockNode[] =>
  s.present.blocks;
export const selectSelectedId = (s: ContentEditorState): string | null =>
  s.selectedId;
export const selectIsDirty = (s: ContentEditorState): boolean => s.dirty;

export const selectLoad = (s: ContentEditorState) => s.load;
export const selectMarkClean = (s: ContentEditorState) => s.markClean;
export const selectSetSelected = (s: ContentEditorState) => s.setSelected;
export const selectAddBlock = (s: ContentEditorState) => s.addBlock;
export const selectRemoveBlock = (s: ContentEditorState) => s.removeBlock;
export const selectMoveBlock = (s: ContentEditorState) => s.moveBlock;
export const selectMoveBlockTo = (s: ContentEditorState) => s.moveBlockTo;
export const selectDuplicateBlock = (s: ContentEditorState) => s.duplicateBlock;
export const selectUpdateBlockProps = (s: ContentEditorState) =>
  s.updateBlockProps;
export const selectUndo = (s: ContentEditorState) => s.undo;
export const selectRedo = (s: ContentEditorState) => s.redo;

// History flags as derived numbers so consumers re-render only when the
// stack lengths change (Zustand shallow-equals on primitives).
export const selectCanUndo = (s: ContentEditorState): boolean =>
  s.past.length > 0;
export const selectCanRedo = (s: ContentEditorState): boolean =>
  s.future.length > 0;
