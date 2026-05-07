/**
 * Named selectors for the editor store.
 *
 * Every piece of store state and every computed value gets an explicit selector.
 * Components import these instead of inlining `store((s) => s.foo)`, which
 * keeps renders narrow and prevents unnecessary re-renders.
 */

import type { EditorState } from "./editor-store";
import { findPath, nodeAt } from "../tree/blockTree";

// State accessors
export const selectPresent = (s: EditorState) => s.present;
export const selectBlocks = (s: EditorState) => s.present.blocks;
export const selectPast = (s: EditorState) => s.past;
export const selectFuture = (s: EditorState) => s.future;
export const selectDirty = (s: EditorState) => s.dirty;
export const selectSelectedId = (s: EditorState) => s.selectedId;
export const selectHoveredBlockId = (s: EditorState) => s.hoveredBlockId;
export const selectHoveredBlockRect = (s: EditorState) => s.hoveredBlockRect;
export const selectSelectedBlockRect = (s: EditorState) => s.selectedBlockRect;

// Computed
export const selectSelectedBlock = (s: EditorState) => {
  if (!s.selectedId) return null;
  const path = findPath(s.present.blocks, s.selectedId);
  return path ? nodeAt(s.present.blocks, path) : null;
};

export const selectCanUndo = (s: EditorState) => s.past.length > 0;
export const selectCanRedo = (s: EditorState) => s.future.length > 0;

// Action mutations
export const selectLoad = (s: EditorState) => s.load;
export const selectMarkClean = (s: EditorState) => s.markClean;
export const selectSetSelected = (s: EditorState) => s.setSelected;
export const selectSetHoveredBlockId = (s: EditorState) => s.setHoveredBlockId;
export const selectSetHoveredBlockRect = (s: EditorState) =>
  s.setHoveredBlockRect;
export const selectSetSelectedBlockRect = (s: EditorState) =>
  s.setSelectedBlockRect;

export const selectAddBlock = (s: EditorState) => s.addBlock;
export const selectRemoveBlock = (s: EditorState) => s.removeBlock;
export const selectMoveBlock = (s: EditorState) => s.moveBlock;
export const selectMoveBlockToPath = (s: EditorState) => s.moveBlockToPath;
export const selectInsertSiblingOf = (s: EditorState) => s.insertSiblingOf;
export const selectInsertChildOf = (s: EditorState) => s.insertChildOf;
export const selectWrapInRowAt = (s: EditorState) => s.wrapInRowAt;
export const selectDuplicateBlock = (s: EditorState) => s.duplicateBlock;
export const selectUpdateBlockId = (s: EditorState) => s.updateBlockId;
export const selectUpdateBlockProps = (s: EditorState) => s.updateBlockProps;
export const selectUpdateBlockStyle = (s: EditorState) => s.updateBlockStyle;
export const selectUpdateBlockVisibility = (s: EditorState) =>
  s.updateBlockVisibility;
export const selectUndo = (s: EditorState) => s.undo;
export const selectRedo = (s: EditorState) => s.redo;
