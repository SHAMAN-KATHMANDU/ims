/**
 * blockTree — pure tree-mutation primitives for the site editor.
 *
 * Single source of truth for every structural mutation on a `BlockNode[]`
 * tree (insert, remove, move, wrap, unwrap). Used by the editor store, DnD
 * handlers, slash menu, and keyboard shortcuts. All functions are
 * referentially-transparent: they never mutate inputs, they always return a
 * new tree (untouched subtrees are reused by reference, so React's identity
 * checks stay cheap).
 *
 * Contracts
 * ---------
 * - A `BlockPath` is the index trail from the root to a node, e.g. `[0, 2, 1]`
 *   means root[0].children[2].children[1].
 * - "Container" kinds are the ones that own a `children` array — currently
 *   `section`, `row`, `columns`, `css-grid` (matches
 *   apps/tenant-site/components/blocks/registry.ts; see WARNING below).
 * - WARNING: keep `CONTAINER_KINDS` in sync with the renderer's registry.
 *   If a new container kind is added there, add it here too — otherwise this
 *   util will treat its children as orphans.
 *
 * Why pure functions?
 * - Trivial unit tests (no React, no Zustand).
 * - Reused by DnD pointer-event handlers WITHOUT going through the store
 *   (e.g. preview-only "would this drop be valid?" checks).
 * - Undo/redo gets first-class support: every mutation produces a new tree
 *   value the store can push onto its history stack as-is.
 */

import type { BlockKind, BlockNode } from "@repo/shared";

/** Block kinds whose `children` array is rendered by the registry. */
export const CONTAINER_KINDS: ReadonlySet<BlockKind> = new Set<BlockKind>([
  "section",
  "row",
  "columns",
  "css-grid",
] as BlockKind[]);

export type BlockPath = readonly number[];

/** Returns true when the given block kind renders nested children. */
export function isContainer(kind: BlockKind): boolean {
  return CONTAINER_KINDS.has(kind);
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/**
 * Walk the tree and return the index path to the first node with `id`.
 * Returns `null` when the id is not present anywhere in the tree.
 */
export function findPath(
  tree: readonly BlockNode[],
  id: string,
): BlockPath | null {
  for (let i = 0; i < tree.length; i += 1) {
    const node = tree[i]!;
    if (node.id === id) return [i];
    if (node.children && node.children.length > 0) {
      const sub = findPath(node.children, id);
      if (sub) return [i, ...sub];
    }
  }
  return null;
}

/** Read the node at `path`, or `null` if the path is out of bounds. */
export function nodeAt(
  tree: readonly BlockNode[],
  path: BlockPath,
): BlockNode | null {
  if (path.length === 0) return null;
  let nodes: readonly BlockNode[] = tree;
  let node: BlockNode | null = null;
  for (let i = 0; i < path.length; i += 1) {
    const idx = path[i]!;
    if (idx < 0 || idx >= nodes.length) return null;
    node = nodes[idx]!;
    if (i < path.length - 1) {
      nodes = node.children ?? [];
    }
  }
  return node;
}

/**
 * Return `true` when `ancestor` is a strict prefix of `descendant`. Used to
 * reject moves that would put a block inside its own subtree.
 */
export function isAncestor(
  ancestor: BlockPath,
  descendant: BlockPath,
): boolean {
  if (ancestor.length >= descendant.length) return false;
  for (let i = 0; i < ancestor.length; i += 1) {
    if (ancestor[i] !== descendant[i]) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Mutations (immutable — always return a new tree)
// ---------------------------------------------------------------------------

/** Replace the children of the node at `parentPath`. `parentPath = []` means root. */
function replaceChildrenAt(
  tree: readonly BlockNode[],
  parentPath: BlockPath,
  children: BlockNode[],
): BlockNode[] {
  if (parentPath.length === 0) return children;
  const [head, ...rest] = parentPath;
  return tree.map((node, idx) => {
    if (idx !== head) return node;
    const nextChildren = replaceChildrenAt(node.children ?? [], rest, children);
    return { ...node, children: nextChildren };
  });
}

/**
 * Insert `node` at the exact `path`. The last index of `path` is the slot
 * within its parent (so `[0, 2]` inserts as parent root[0]'s 3rd child).
 * No-op (returns input) if the path is unreachable.
 */
export function insertAt(
  tree: readonly BlockNode[],
  path: BlockPath,
  node: BlockNode,
): BlockNode[] {
  if (path.length === 0) return [...tree];
  const parentPath = path.slice(0, -1);
  const slot = path[path.length - 1]!;
  const parentChildren =
    parentPath.length === 0
      ? tree
      : (nodeAt(tree, parentPath)?.children ?? null);
  if (parentChildren === null && parentPath.length > 0) return [...tree];
  const current = parentChildren ?? [];
  const clamped = Math.max(0, Math.min(slot, current.length));
  const next = [...current.slice(0, clamped), node, ...current.slice(clamped)];
  return replaceChildrenAt(tree, parentPath, next);
}

/**
 * Remove and return the node at `path`. If the path is invalid, returns the
 * input tree and `node: null`.
 */
export function removeAt(
  tree: readonly BlockNode[],
  path: BlockPath,
): { tree: BlockNode[]; node: BlockNode | null } {
  if (path.length === 0) return { tree: [...tree], node: null };
  const parentPath = path.slice(0, -1);
  const slot = path[path.length - 1]!;
  const parentChildren =
    parentPath.length === 0
      ? tree
      : (nodeAt(tree, parentPath)?.children ?? null);
  if (parentChildren === null) return { tree: [...tree], node: null };
  if (slot < 0 || slot >= parentChildren.length) {
    return { tree: [...tree], node: null };
  }
  const node = parentChildren[slot]!;
  const next = [
    ...parentChildren.slice(0, slot),
    ...parentChildren.slice(slot + 1),
  ];
  const newTree = replaceChildrenAt(tree, parentPath, next);
  return { tree: newTree, node };
}

/**
 * Move the node at `fromPath` to `toPath`. The `toPath` is interpreted in
 * the **post-removal** index space, with one twist: when `from` and `to`
 * share the same parent and `to` lies after `from`, the slot index needs to
 * shift down by 1 to account for the removal — we handle that automatically
 * here so callers can pass the visible "drop slot" without thinking about it.
 *
 * No-ops:
 *   - empty `fromPath`,
 *   - moving a node into its own subtree (`from` is an ancestor of `to`),
 *   - source path missing.
 */
export function move(
  tree: readonly BlockNode[],
  fromPath: BlockPath,
  toPath: BlockPath,
): BlockNode[] {
  if (fromPath.length === 0 || toPath.length === 0) return [...tree];
  if (isAncestor(fromPath, toPath)) return [...tree];
  // Identical drop is a no-op.
  if (
    fromPath.length === toPath.length &&
    fromPath.every((v, i) => v === toPath[i])
  ) {
    return [...tree];
  }

  const { tree: removed, node } = removeAt(tree, fromPath);
  if (!node) return [...tree];

  // Adjustment rule: removal shifts later siblings of `fromPath` down by 1
  // at the depth of `fromPath`'s parent (= `fromPath.length - 1`). Any
  // `toPath` that shares the same parent prefix at that depth and points
  // to a slot AFTER the removed one needs to decrement the index at that
  // depth. Subsumes both same-parent reorder and into-later-sibling-subtree
  // moves.
  const adjustDepth = fromPath.length - 1;
  const adjusted = [...toPath];
  if (toPath.length > adjustDepth) {
    const prefixMatches = fromPath
      .slice(0, adjustDepth)
      .every((v, i) => v === toPath[i]);
    if (prefixMatches && toPath[adjustDepth]! > fromPath[adjustDepth]!) {
      adjusted[adjustDepth] = toPath[adjustDepth]! - 1;
    }
  }

  return insertAt(removed, adjusted, node);
}

// ---------------------------------------------------------------------------
// High-level helpers
// ---------------------------------------------------------------------------

/**
 * Insert `newBlock` as a sibling of the block with id `anchorId`. Returns
 * the input tree unchanged when the anchor is not found.
 */
export function insertSibling(
  tree: readonly BlockNode[],
  anchorId: string,
  where: "before" | "after",
  newBlock: BlockNode,
): BlockNode[] {
  const anchorPath = findPath(tree, anchorId);
  if (!anchorPath) return [...tree];
  const slot = anchorPath[anchorPath.length - 1]! + (where === "after" ? 1 : 0);
  const insertPath = [...anchorPath.slice(0, -1), slot];
  return insertAt(tree, insertPath, newBlock);
}

/**
 * Append `newBlock` as a child of the container with id `parentId`. If the
 * target is not a container kind, this is a no-op (returns input). Use
 * `index` to control insertion position; pass `-1` (default) to append.
 */
export function insertChild(
  tree: readonly BlockNode[],
  parentId: string,
  newBlock: BlockNode,
  index: number = -1,
): BlockNode[] {
  const parentPath = findPath(tree, parentId);
  if (!parentPath) return [...tree];
  const parent = nodeAt(tree, parentPath);
  if (!parent || !isContainer(parent.kind)) return [...tree];
  const childCount = parent.children?.length ?? 0;
  const slot = index < 0 ? childCount : index;
  return insertAt(tree, [...parentPath, slot], newBlock);
}

/**
 * Replace the anchor block with a `row` container holding the anchor and
 * `newBlock` side-by-side. `side: "left"` puts the new block first; `"right"`
 * puts it last.
 *
 * The row is created with the caller-supplied id + props (we don't import the
 * row catalog from `packages/shared` here to keep this file dependency-free
 * in tests; the editor-store wrapper supplies the row factory).
 */
export function wrapInRow(
  tree: readonly BlockNode[],
  anchorId: string,
  side: "left" | "right",
  newBlock: BlockNode,
  rowFactory: (children: BlockNode[]) => BlockNode,
): BlockNode[] {
  const anchorPath = findPath(tree, anchorId);
  if (!anchorPath) return [...tree];
  const anchor = nodeAt(tree, anchorPath);
  if (!anchor) return [...tree];
  const children = side === "left" ? [newBlock, anchor] : [anchor, newBlock];
  const row = rowFactory(children);
  // Replace anchor in-place by removing it then inserting the row at the same slot.
  const slot = anchorPath[anchorPath.length - 1]!;
  const parentPath = anchorPath.slice(0, -1);
  const { tree: removed } = removeAt(tree, anchorPath);
  return insertAt(removed, [...parentPath, slot], row);
}

/**
 * Walk the tree and collapse any `row`/`columns`/`css-grid` container that
 * has 0 or 1 children (post-mutation cleanup after a cross-depth move). A
 * 0-child container is removed; a 1-child container is replaced inline by
 * its sole child. `section` is preserved at all sizes — it's a layout
 * landmark, not just a wrapper.
 */
export function unwrapEmpty(tree: readonly BlockNode[]): BlockNode[] {
  const COLLAPSIBLE: ReadonlySet<BlockKind> = new Set<BlockKind>([
    "row",
    "columns",
    "css-grid",
  ] as BlockKind[]);

  function walk(nodes: readonly BlockNode[]): BlockNode[] {
    const out: BlockNode[] = [];
    for (const node of nodes) {
      const recursed = node.children
        ? { ...node, children: walk(node.children) }
        : node;
      if (
        COLLAPSIBLE.has(recursed.kind) &&
        (recursed.children?.length ?? 0) <= 1
      ) {
        if (recursed.children && recursed.children.length === 1) {
          out.push(recursed.children[0]!);
        }
        // 0-child collapsible: drop it entirely
        continue;
      }
      out.push(recursed);
    }
    return out;
  }

  return walk(tree);
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/** Yield every node in the tree in pre-order (parent before children). */
export function* walk(tree: readonly BlockNode[]): Generator<BlockNode> {
  for (const node of tree) {
    yield node;
    if (node.children) yield* walk(node.children);
  }
}

/** Count every node in the tree (including nested). */
export function countNodes(tree: readonly BlockNode[]): number {
  let n = 0;
  for (const _ of walk(tree)) n += 1;
  return n;
}
