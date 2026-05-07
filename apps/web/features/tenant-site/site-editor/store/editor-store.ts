/**
 * Editor state store.
 *
 * A Zustand store with pure-reducer tree mutations and a past/present/future
 * history stack. The whole block tree is the "doc"; every mutation snapshots
 * the previous state into `past` so undo/redo work without any per-field tracking.
 *
 * The store does not talk to the network. Callers wire it to TanStack mutations
 * for save/publish and react to `dirty` state for save-button affordances.
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

import type { BlockPath } from "../tree/blockTree";
import {
  findPath,
  insertChild as insertChildTree,
  insertSibling as insertSiblingTree,
  move as moveInTree,
  nodeAt,
  unwrapEmpty,
  wrapInRow as wrapInRowTree,
} from "../tree/blockTree";
import { cloneTree, type EditorSnapshot } from "./snapshots";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlockRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EditorState {
  past: EditorSnapshot[];
  present: EditorSnapshot;
  future: EditorSnapshot[];
  selectedId: string | null;
  dirty: boolean;

  hoveredBlockId: string | null;
  hoveredBlockRect: BlockRect | null;
  selectedBlockRect: BlockRect | null;

  // Lifecycle
  load: (blocks: BlockNode[]) => void;
  markClean: () => void;

  // Selection
  setSelected: (id: string | null) => void;
  setHoveredBlockId: (id: string | null) => void;
  setHoveredBlockRect: (rect: BlockRect | null) => void;
  setSelectedBlockRect: (rect: BlockRect | null) => void;

  // Tree mutations
  addBlock: (block: BlockNode, atIndex?: number) => void;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, delta: -1 | 1) => void;
  moveBlockToPath: (fromPath: BlockPath, toPath: BlockPath) => void;
  insertSiblingOf: (
    anchorId: string,
    where: "before" | "after",
    block: BlockNode,
  ) => void;
  insertChildOf: (parentId: string, block: BlockNode, index?: number) => void;
  wrapInRowAt: (
    anchorId: string,
    side: "left" | "right",
    block: BlockNode,
  ) => void;
  duplicateBlock: (id: string) => void;
  updateBlockId: (id: string, newId: string) => void;
  updateBlockProps: <K extends BlockKind>(
    id: string,
    props: Partial<BlockPropsMap[K]>,
  ) => void;
  updateBlockVisibility: (
    id: string,
    visibility: Partial<BlockVisibility>,
  ) => void;
  updateBlockStyle: (id: string, style: Partial<BlockStyleOverride>) => void;

  // History
  undo: () => void;
  redo: () => void;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

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

function makeDefaultRow(children: BlockNode[]): BlockNode {
  const entry = BLOCK_CATALOG_ENTRIES.find((e) => e.kind === "row");
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
  function commit(next: EditorSnapshot) {
    const { past, present } = get();
    const nextPast: EditorSnapshot[] = [
      ...past,
      { blocks: cloneTree(present.blocks) },
    ];
    if (nextPast.length > HISTORY_LIMIT) nextPast.shift();
    set({
      past: nextPast,
      present: { blocks: cloneTree(next.blocks) },
      future: [],
      dirty: true,
    });
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
        present: { blocks: cloneTree(blocks) },
        future: [],
        selectedId: null,
        dirty: false,
      }),

    markClean: () => set({ dirty: false }),

    setSelected: (id) => set({ selectedId: id }),
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

      const { tree: newBlocks } = (() => {
        const parentPath = path.slice(0, -1);
        const slot = path[path.length - 1]!;
        if (parentPath.length === 0) {
          return {
            tree: [
              ...present.blocks.slice(0, slot),
              ...present.blocks.slice(slot + 1),
            ],
          };
        }

        const parent = nodeAt(present.blocks, parentPath);
        if (!parent || !parent.children) return { tree: present.blocks };

        const nextChildren = [
          ...parent.children.slice(0, slot),
          ...parent.children.slice(slot + 1),
        ];

        function rebuild(nodes: BlockNode[], depth: number): BlockNode[] {
          return nodes.map((n, i) => {
            if (i !== parentPath[depth]) return n;
            if (depth === parentPath.length - 1) {
              return { ...n, children: nextChildren };
            }
            return {
              ...n,
              children: rebuild(n.children ?? [], depth + 1),
            };
          });
        }

        return { tree: rebuild(present.blocks, 0) };
      })();

      commit({ blocks: newBlocks });
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
        delta > 0 ? [...parentPath, target + 1] : [...parentPath, target],
      );
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

    duplicateBlock: (id) => {
      const { present } = get();
      const path = findPath(present.blocks, id);
      if (!path) return;
      const source = nodeAt(present.blocks, path);
      if (!source) return;
      const newId = `${source.kind}-${crypto.randomUUID().slice(0, 8)}`;
      const clone = JSON.parse(JSON.stringify(source)) as BlockNode;
      clone.id = newId;
      const blocks = insertSiblingTree(present.blocks, id, "after", clone);
      commit({ blocks });
      set({ selectedId: newId });
    },

    updateBlockId: (id, newId) => {
      if (!newId || newId === id) return;
      const { present, selectedId } = get();
      const blocks = mapBlocks(present.blocks, id, (b) => ({
        ...b,
        id: newId,
      }));
      commit({ blocks });
      if (selectedId === id) set({ selectedId: newId });
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

    updateBlockStyle: (id, style) => {
      const { present } = get();
      const blocks = mapBlocks(present.blocks, id, (b) => ({
        ...b,
        style: { ...(b.style ?? {}), ...style },
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
        future: [{ blocks: cloneTree(present.blocks) }, ...future],
        dirty: true,
      });
    },

    redo: () => {
      const { past, present, future } = get();
      if (future.length === 0) return;
      const next = future[0]!;
      const nextFuture = future.slice(1);
      set({
        past: [...past, { blocks: cloneTree(present.blocks) }],
        present: next,
        future: nextFuture,
        dirty: true,
      });
    },
  };
});

// Re-export named selectors so consumers can import both the store hook and
// selectors from a single module: `import { useEditorStore, selectFoo } from "./store/editor-store"`.
export * from "./selectors";
