/**
 * Snapshot and cloning utilities for the editor store.
 *
 * EditorSnapshot represents an immutable point-in-time of the editor state.
 * cloneTree uses structuredClone for deep copying of block trees.
 */

import type { BlockNode } from "@repo/shared";

export interface EditorSnapshot {
  blocks: BlockNode[];
}

/**
 * Deep clone a block tree using structuredClone (native or polyfill).
 * Used by the store's commit() to ensure undo/redo stacks don't share references.
 */
export function cloneTree(tree: readonly BlockNode[]): BlockNode[] {
  return structuredClone([...tree]);
}
