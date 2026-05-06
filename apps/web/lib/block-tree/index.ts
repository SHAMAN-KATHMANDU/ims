/**
 * Block-tree primitives — pure tree-mutation + drop-zone helpers shared by
 * the site editor (`features/tenant-site/site-editor`) and the CMS body
 * editor (`features/content`).
 *
 * Zero React, zero Zustand, zero feature imports. Safe to import from any
 * module — including server components and tests — without pulling editor
 * UI baggage along with it.
 */

export {
  CONTAINER_KINDS,
  isContainer,
  findPath,
  nodeAt,
  isAncestor,
  insertAt,
  removeAt,
  move,
  insertSibling,
  insertChild,
  wrapInRow,
  unwrapEmpty,
  walk,
  countNodes,
  type BlockPath,
} from "./blockTree";

export {
  resolveDropZone,
  type DropZone,
  type DropTargetInput,
  type DropTargetResult,
} from "./dropZones";
