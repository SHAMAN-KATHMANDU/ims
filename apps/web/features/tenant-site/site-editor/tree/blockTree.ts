/**
 * Pure tree-mutation primitives for the site editor.
 *
 * Every structural mutation on a BlockNode[] tree (insert, remove, move, wrap,
 * unwrap, duplicate) is a pure function. Returns a new tree; never mutates inputs.
 * Used by the editor store, DnD handlers, slash menu, and keyboard shortcuts.
 *
 * A BlockPath is the index trail from the root to a node:
 * [0, 2, 1] means root[0].children[2].children[1].
 */

import type { BlockKind, BlockNode } from "@repo/shared";
import { CONTAINER_KINDS } from "./containerKinds";

export type BlockPath = readonly number[];

function isContainer(kind: BlockKind): boolean {
  return CONTAINER_KINDS.includes(kind as (typeof CONTAINER_KINDS)[number]);
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

/**
 * Read the node at `path`, or `null` if the path is out of bounds.
 */
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
 * Return `true` when `ancestor` is a strict prefix of `descendant`.
 * Used to reject moves that would put a block inside its own subtree.
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
// Core mutations (immutable)
// ---------------------------------------------------------------------------

/**
 * Replace the children of the node at `parentPath`. `parentPath = []` means root.
 */
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
  if (
    fromPath.length === toPath.length &&
    fromPath.every((v, i) => v === toPath[i])
  ) {
    return [...tree];
  }

  const { tree: removed, node } = removeAt(tree, fromPath);
  if (!node) return [...tree];

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
 * Insert `newBlock` as a sibling of the block with id `anchorId`.
 * Returns the input tree unchanged when the anchor is not found.
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
 * Append `newBlock` as a child of the container with id `parentId`.
 * If the target is not a container kind, this is a no-op (returns input).
 * Use `index` to control insertion position; pass `-1` (default) to append.
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
 * The row is created with the caller-supplied factory function
 * (e.g. `makeDefaultRow` from editor-store).
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
  const slot = anchorPath[anchorPath.length - 1]!;
  const parentPath = anchorPath.slice(0, -1);
  const { tree: removed } = removeAt(tree, anchorPath);
  return insertAt(removed, [...parentPath, slot], row);
}

/**
 * Duplicate the block at the given ID.
 * Inserts the clone as a sibling immediately after the original.
 */
export function duplicate(
  tree: readonly BlockNode[],
  id: string,
  idFactory: (oldId: string) => string,
): BlockNode[] {
  const path = findPath(tree, id);
  if (!path) return [...tree];
  const source = nodeAt(tree, path);
  if (!source) return [...tree];
  const newId = idFactory(source.id);
  const clone = JSON.parse(JSON.stringify(source)) as BlockNode;
  clone.id = newId;
  return insertSibling(tree, id, "after", clone);
}

/**
 * Walk the tree and collapse any `row`/`columns`/`css-grid` container that
 * has 0 or 1 children (post-mutation cleanup after a cross-depth move).
 * A 0-child container is removed; a 1-child container is replaced inline by
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
        continue;
      }
      out.push(recursed);
    }
    return out;
  }

  return walk(tree);
}

/**
 * Yield every node in the tree in pre-order (parent before children).
 */
export function* walk(tree: readonly BlockNode[]): Generator<BlockNode> {
  for (const node of tree) {
    yield node;
    if (node.children) yield* walk(node.children);
  }
}
