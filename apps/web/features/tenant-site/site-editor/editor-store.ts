/**
 * Framer-lite editor state store.
 *
 * A minimal Zustand store with pure-reducer tree mutations and a
 * past/present/future history stack. The whole block tree is the "doc";
 * every mutation snapshots the previous state into `past` so undo/redo
 * work without any per-field tracking.
 *
 * The store does not talk to the network. Callers (editor components)
 * wire it to TanStack mutations for save/publish and react to `dirty`
 * state for save-button affordances.
 */

import { create } from "zustand";
import type {
  BlockKind,
  BlockNode,
  BlockPropsMap,
  BlockVisibility,
} from "@repo/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EditorSnapshot {
  blocks: BlockNode[];
}

interface EditorState {
  past: EditorSnapshot[];
  present: EditorSnapshot;
  future: EditorSnapshot[];
  /** Selected block id — null when nothing's selected. */
  selectedId: string | null;
  /** Clean state matches the last loaded/saved tree; dirty means edits pending. */
  dirty: boolean;

  // ---- lifecycle ----
  /** Replace the whole tree — used after initial load or after a publish. */
  load: (blocks: BlockNode[]) => void;
  /** Mark the current tree as clean (e.g. after a successful save). */
  markClean: () => void;

  // ---- selection ----
  setSelected: (id: string | null) => void;

  // ---- tree mutations ----
  addBlock: (block: BlockNode, atIndex?: number) => void;
  removeBlock: (id: string) => void;
  /** Move a block by ±1 delta or to an absolute target index. */
  moveBlock: (id: string, delta: -1 | 1) => void;
  moveBlockTo: (id: string, toIndex: number) => void;
  updateBlockProps: <K extends BlockKind>(
    id: string,
    props: Partial<BlockPropsMap[K]>,
  ) => void;
  updateBlockVisibility: (
    id: string,
    visibility: Partial<BlockVisibility>,
  ) => void;
  updateBlockId: (oldId: string, newId: string) => void;
  updateBlockResponsive: (
    id: string,
    device: "mobile" | "tablet",
    overrides: Record<string, unknown> | undefined,
  ) => void;

  // ---- history ----
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

// ---------------------------------------------------------------------------
// Pure reducers
// ---------------------------------------------------------------------------

function findIndexById(blocks: BlockNode[], id: string): number {
  return blocks.findIndex((b) => b.id === id);
}

function mapBlocks(
  blocks: BlockNode[],
  id: string,
  fn: (block: BlockNode) => BlockNode,
): BlockNode[] {
  return blocks.map((b) => (b.id === id ? fn(b) : b));
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const EMPTY_SNAPSHOT: EditorSnapshot = { blocks: [] };
const HISTORY_LIMIT = 50;

export const useEditorStore = create<EditorState>()((set, get) => {
  // Helper — used by every mutation. Pushes the current present onto `past`
  // (capped) and sets a new present. Clears `future` (redo invalidated).
  function commit(next: EditorSnapshot) {
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
        present: { blocks },
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
      const blocks = present.blocks.filter((b) => b.id !== id);
      commit({ blocks });
      if (selectedId === id) set({ selectedId: null });
    },

    moveBlock: (id, delta) => {
      const { present } = get();
      const idx = findIndexById(present.blocks, id);
      if (idx === -1) return;
      const target = idx + delta;
      if (target < 0 || target >= present.blocks.length) return;
      const blocks = [...present.blocks];
      const [item] = blocks.splice(idx, 1);
      blocks.splice(target, 0, item!);
      commit({ blocks });
    },

    moveBlockTo: (id, toIndex) => {
      const { present } = get();
      const fromIndex = findIndexById(present.blocks, id);
      if (fromIndex === -1 || fromIndex === toIndex) return;
      const clamped = Math.max(0, Math.min(toIndex, present.blocks.length - 1));
      const blocks = [...present.blocks];
      const [item] = blocks.splice(fromIndex, 1);
      blocks.splice(clamped, 0, item!);
      commit({ blocks });
    },

    updateBlockProps: (id, props) => {
      const { present } = get();
      const blocks = mapBlocks(present.blocks, id, (b) => ({
        ...b,
        props: {
          ...(b.props as Record<string, unknown>),
          ...props,
        } as unknown as BlockNode["props"],
      }));
      commit({ blocks });
    },

    updateBlockVisibility: (id, visibility) => {
      const { present } = get();
      const blocks = mapBlocks(present.blocks, id, (b) => ({
        ...b,
        visibility: { ...(b.visibility ?? {}), ...visibility },
      }));
      commit({ blocks });
    },

    updateBlockId: (oldId, newId) => {
      if (!newId.trim() || oldId === newId) return;
      const { present, selectedId } = get();
      const blocks = present.blocks.map((b) =>
        b.id === oldId ? { ...b, id: newId } : b,
      );
      commit({ blocks });
      if (selectedId === oldId) set({ selectedId: newId });
    },

    updateBlockResponsive: (id, device, overrides) => {
      const { present } = get();
      const blocks = mapBlocks(present.blocks, id, (b) => ({
        ...b,
        responsive: {
          ...(b.responsive ?? {}),
          [device]: overrides,
        },
      }));
      commit({ blocks });
    },

    undo: () => {
      const { past, present, future } = get();
      if (past.length === 0) return;
      const previous = past[past.length - 1]!;
      const nextPast = past.slice(0, -1);
      set({
        past: nextPast,
        present: previous,
        future: [present, ...future],
        dirty: true,
      });
    },

    redo: () => {
      const { past, present, future } = get();
      if (future.length === 0) return;
      const next = future[0]!;
      const nextFuture = future.slice(1);
      set({
        past: [...past, present],
        present: next,
        future: nextFuture,
        dirty: true,
      });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  };
});

// Convenience selectors — components import these instead of the whole store
// to keep renders narrow.
export const selectBlocks = (s: EditorState) => s.present.blocks;
export const selectSelectedId = (s: EditorState) => s.selectedId;
export const selectSelectedBlock = (s: EditorState): BlockNode | null => {
  if (!s.selectedId) return null;
  return s.present.blocks.find((b) => b.id === s.selectedId) ?? null;
};
export const selectDirty = (s: EditorState) => s.dirty;
