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
  BlockStyleOverride,
  BlockVisibility,
} from "@repo/shared";
import { BLOCK_CATALOG_ENTRIES } from "@repo/shared";
import {
  type BlockPath,
  findPath,
  insertChild as insertChildTree,
  insertSibling as insertSiblingTree,
  move as moveInTree,
  nodeAt,
  unwrapEmpty,
  wrapInRow as wrapInRowTree,
} from "@/lib/block-tree";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EditorSnapshot {
  blocks: BlockNode[];
}

/** Serialisable bounding rect (mirrors DOMRect.toJSON() shape). */
export interface BlockRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EditorState {
  past: EditorSnapshot[];
  present: EditorSnapshot;
  future: EditorSnapshot[];
  /** Selected block id — null when nothing's selected. */
  selectedId: string | null;
  /** Clean state matches the last loaded/saved tree; dirty means edits pending. */
  dirty: boolean;

  // ---- hover / selection rect (populated by EditorBridge for cross-origin overlays) ----
  /** Block currently under the cursor (cross-origin postMessage path). */
  hoveredBlockId: string | null;
  /** Bounding rect of hovered block in iframe-document coordinates. */
  hoveredBlockRect: BlockRect | null;
  /** Bounding rect of the selected block in iframe-document coordinates. */
  selectedBlockRect: BlockRect | null;

  // ---- lifecycle ----
  /** Replace the whole tree — used after initial load or after a publish. */
  load: (blocks: BlockNode[]) => void;
  /** Mark the current tree as clean (e.g. after a successful save). */
  markClean: () => void;

  // ---- selection ----
  setSelected: (id: string | null) => void;
  setHoveredBlockId: (id: string | null) => void;
  setHoveredBlockRect: (rect: BlockRect | null) => void;
  setSelectedBlockRect: (rect: BlockRect | null) => void;

  // ---- tree mutations ----
  addBlock: (block: BlockNode, atIndex?: number) => void;
  /** Tree-aware: removes a block at any depth. */
  removeBlock: (id: string) => void;
  /** Move a block by ±1 delta among its current siblings (any depth). */
  moveBlock: (id: string, delta: -1 | 1) => void;
  /** Move a block to a target index in the SAME parent (any depth). */
  moveBlockTo: (id: string, toIndex: number) => void;
  /**
   * Cross-depth move via explicit paths. After the move, any row/columns
   * containers left with ≤1 child are auto-collapsed (`unwrapEmpty`).
   */
  moveBlockToPath: (fromPath: BlockPath, toPath: BlockPath) => void;
  /** Insert a sibling of `anchorId` (any depth). */
  insertSiblingOf: (
    anchorId: string,
    where: "before" | "after",
    block: BlockNode,
  ) => void;
  /**
   * Insert a child of the container with id `parentId`. No-op if the target
   * is not a container kind.
   */
  insertChildOf: (parentId: string, block: BlockNode, index?: number) => void;
  /**
   * Wrap an anchor with a `row` container; place `block` on `side`. Uses the
   * shared row catalog's default props.
   */
  wrapInRowAt: (
    anchorId: string,
    side: "left" | "right",
    block: BlockNode,
  ) => void;
  updateBlockProps: <K extends BlockKind>(
    id: string,
    props: Partial<BlockPropsMap[K]>,
  ) => void;
  updateBlockVisibility: (
    id: string,
    visibility: Partial<BlockVisibility>,
  ) => void;
  updateBlockId: (oldId: string, newId: string) => void;
  updateBlockStyle: (id: string, style: Partial<BlockStyleOverride>) => void;
  duplicateBlock: (id: string) => void;
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

/**
 * Apply `fn` to the (single) node with `id` anywhere in the tree, recursing
 * into `children`. Used for per-field updates (props, visibility, style,
 * responsive) — those work at any depth out of the box.
 */
function mapBlocks(
  blocks: BlockNode[],
  id: string,
  fn: (block: BlockNode) => BlockNode,
): BlockNode[] {
  return blocks.map((b) => {
    if (b.id === id) return fn(b);
    if (b.children && b.children.length > 0) {
      const nextChildren = mapBlocks(b.children, id, fn);
      if (nextChildren !== b.children) return { ...b, children: nextChildren };
    }
    return b;
  });
}

/** Look up the row catalog entry once. Defaults are stable across calls. */
function makeDefaultRow(children: BlockNode[]): BlockNode {
  const entry = BLOCK_CATALOG_ENTRIES.find((e) => e.kind === "row");
  // Defensive: if the catalog ever drops "row", fall back to a minimal shape
  // so a misconfigured editor still applies the wrap (the renderer will
  // ignore unknown kinds — see BlockNodeSchema forward-compat note).
  const props = entry?.createDefaultProps() ?? ({} as BlockNode["props"]);
  return {
    id: `row-${crypto.randomUUID().slice(0, 8)}`,
    kind: "row" as BlockNode["kind"],
    props,
    children,
  };
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
    hoveredBlockId: null,
    hoveredBlockRect: null,
    selectedBlockRect: null,

    load: (blocks) =>
      set({
        past: [],
        present: { blocks },
        future: [],
        selectedId: null,
        dirty: false,
      }),

    markClean: () => set({ dirty: false }),

    setSelected: (id) => {
      if (
        typeof window !== "undefined" &&
        window.localStorage?.getItem("site-editor:debug") === "1"
      ) {
        const present = get().present.blocks;
        const found = id ? findPath(present, id) : null;
        // eslint-disable-next-line no-console
        console.log("[site-editor:store] setSelected", {
          id,
          treeSize: present.length,
          foundInTree: !!found,
        });
      }
      set({ selectedId: id });
    },
    setHoveredBlockId: (id) => set({ hoveredBlockId: id }),
    setHoveredBlockRect: (rect) => set({ hoveredBlockRect: rect }),
    setSelectedBlockRect: (rect) => set({ selectedBlockRect: rect }),

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
      const path = findPath(present.blocks, id);
      if (!path) return;
      const fromPath = path.slice(0, -1);
      const slot = path[path.length - 1]!;
      // Use blockTree's path-aware removal so nested blocks work too.
      const parentPath = fromPath;
      const parentChildren =
        parentPath.length === 0
          ? present.blocks
          : (nodeAt(present.blocks, parentPath)?.children ?? []);
      const nextSiblings = [
        ...parentChildren.slice(0, slot),
        ...parentChildren.slice(slot + 1),
      ];
      // Reuse moveInTree's removeAt indirectly via a simple direct path edit:
      const blocks = (() => {
        if (parentPath.length === 0) return nextSiblings;
        // Rebuild only along the parent path.
        function rebuild(nodes: BlockNode[], depth: number): BlockNode[] {
          return nodes.map((n, i) => {
            if (i !== parentPath[depth]) return n;
            if (depth === parentPath.length - 1) {
              return { ...n, children: nextSiblings };
            }
            return {
              ...n,
              children: rebuild(n.children ?? [], depth + 1),
            };
          });
        }
        return rebuild(present.blocks, 0);
      })();
      commit({ blocks });
      if (selectedId === id) set({ selectedId: null });
    },

    moveBlock: (id, delta) => {
      const { present } = get();
      const path = findPath(present.blocks, id);
      if (!path) return;
      const slot = path[path.length - 1]!;
      const parentPath = path.slice(0, -1);
      const parentChildren =
        parentPath.length === 0
          ? present.blocks
          : (nodeAt(present.blocks, parentPath)?.children ?? []);
      const target = slot + delta;
      if (target < 0 || target >= parentChildren.length) return;
      const blocks = moveInTree(
        present.blocks,
        path,
        // moveInTree adjusts forward-moves automatically; pass the visible
        // post-removal target slot.
        delta > 0 ? [...parentPath, target + 1] : [...parentPath, target],
      );
      commit({ blocks });
    },

    moveBlockTo: (id, toIndex) => {
      const { present } = get();
      const path = findPath(present.blocks, id);
      if (!path) return;
      const slot = path[path.length - 1]!;
      const parentPath = path.slice(0, -1);
      const parentChildren =
        parentPath.length === 0
          ? present.blocks
          : (nodeAt(present.blocks, parentPath)?.children ?? []);
      if (parentChildren.length === 0) return;
      const clamped = Math.max(0, Math.min(toIndex, parentChildren.length - 1));
      if (clamped === slot) return;
      const blocks = moveInTree(present.blocks, path, [
        ...parentPath,
        clamped > slot ? clamped + 1 : clamped,
      ]);
      commit({ blocks });
    },

    moveBlockToPath: (fromPath, toPath) => {
      const { present } = get();
      const moved = moveInTree(present.blocks, fromPath, toPath);
      const cleaned = unwrapEmpty(moved);
      commit({ blocks: cleaned });
    },

    insertSiblingOf: (anchorId, where, block) => {
      const { present } = get();
      const blocks = insertSiblingTree(present.blocks, anchorId, where, block);
      commit({ blocks });
      set({ selectedId: block.id });
    },

    insertChildOf: (parentId, block, index = -1) => {
      const { present } = get();
      const blocks = insertChildTree(present.blocks, parentId, block, index);
      commit({ blocks });
      set({ selectedId: block.id });
    },

    wrapInRowAt: (anchorId, side, block) => {
      const { present } = get();
      const blocks = wrapInRowTree(
        present.blocks,
        anchorId,
        side,
        block,
        makeDefaultRow,
      );
      commit({ blocks });
      set({ selectedId: block.id });
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

    updateBlockStyle: (id, style) => {
      const { present } = get();
      const blocks = mapBlocks(present.blocks, id, (b) => ({
        ...b,
        style: { ...(b.style ?? {}), ...style },
      }));
      commit({ blocks });
    },

    duplicateBlock: (id) => {
      const { present } = get();
      const path = findPath(present.blocks, id);
      if (!path) return;
      const source = nodeAt(present.blocks, path);
      if (!source) return;
      const newId = `${source.kind}-${crypto.randomUUID().slice(0, 8)}`;
      const clone: BlockNode = JSON.parse(JSON.stringify(source));
      clone.id = newId;
      const blocks = insertSiblingTree(present.blocks, id, "after", clone);
      commit({ blocks });
      set({ selectedId: newId });
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
  // Tree-aware: walk into containers to support nested selection.
  const path = findPath(s.present.blocks, s.selectedId);
  return path ? nodeAt(s.present.blocks, path) : null;
};
export const selectDirty = (s: EditorState) => s.dirty;

// Action selectors
export const selectSetSelected = (s: EditorState) => s.setSelected;
export const selectLoad = (s: EditorState) => s.load;
export const selectMarkClean = (s: EditorState) => s.markClean;
export const selectAddBlock = (s: EditorState) => s.addBlock;
export const selectRemoveBlock = (s: EditorState) => s.removeBlock;
export const selectMoveBlock = (s: EditorState) => s.moveBlock;
export const selectMoveBlockTo = (s: EditorState) => s.moveBlockTo;
export const selectMoveBlockToPath = (s: EditorState) => s.moveBlockToPath;
export const selectInsertSiblingOf = (s: EditorState) => s.insertSiblingOf;
export const selectInsertChildOf = (s: EditorState) => s.insertChildOf;
export const selectWrapInRowAt = (s: EditorState) => s.wrapInRowAt;
export const selectUpdateBlockProps = (s: EditorState) => s.updateBlockProps;
export const selectUpdateBlockVisibility = (s: EditorState) =>
  s.updateBlockVisibility;
export const selectUpdateBlockId = (s: EditorState) => s.updateBlockId;
export const selectUpdateBlockStyle = (s: EditorState) => s.updateBlockStyle;
export const selectDuplicateBlock = (s: EditorState) => s.duplicateBlock;
export const selectUpdateBlockResponsive = (s: EditorState) =>
  s.updateBlockResponsive;
export const selectUndo = (s: EditorState) => s.undo;
export const selectRedo = (s: EditorState) => s.redo;
export const selectCanUndo = (s: EditorState) => s.canUndo;
export const selectCanRedo = (s: EditorState) => s.canRedo;
export const selectCanUndoResult = (s: EditorState) => s.canUndo();
export const selectCanRedoResult = (s: EditorState) => s.canRedo();

// Hover / selection rect selectors (for CanvasOverlay cross-origin path)
export const selectHoveredBlockId = (s: EditorState) => s.hoveredBlockId;
export const selectHoveredBlockRect = (s: EditorState) => s.hoveredBlockRect;
export const selectSelectedBlockRect = (s: EditorState) => s.selectedBlockRect;
export const selectSetHoveredBlockId = (s: EditorState) => s.setHoveredBlockId;
export const selectSetHoveredBlockRect = (s: EditorState) =>
  s.setHoveredBlockRect;
export const selectSetSelectedBlockRect = (s: EditorState) =>
  s.setSelectedBlockRect;

// ---------------------------------------------------------------------------
// Draft persistence helpers (Zustand `persist` middleware shape-compatible)
// ---------------------------------------------------------------------------

export interface PersistedEditorStateData {
  present: EditorSnapshot;
  dirty: boolean;
  savedAt: number;
}

export function buildEditorStorageKey(
  tenantId: string,
  scope: string,
  pageId: string | null | undefined,
): string {
  return `site-editor:${tenantId}:${scope}:${pageId ?? "none"}`;
}

export function getPersistedDraft(
  tenantId: string,
  scope: string,
  pageId: string | null | undefined,
): PersistedEditorStateData | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(
    buildEditorStorageKey(tenantId, scope, pageId),
  );
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: PersistedEditorStateData };
    return parsed?.state ?? null;
  } catch {
    return null;
  }
}

export function clearPersistedDraft(
  tenantId: string,
  scope: string,
  pageId: string | null | undefined,
): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(buildEditorStorageKey(tenantId, scope, pageId));
}
