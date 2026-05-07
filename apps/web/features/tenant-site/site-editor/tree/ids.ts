/**
 * Block ID generation and creation factories.
 *
 * - resetIdCounter() — reset for deterministic IDs in tests/templates
 * - createBlockId() — generate a unique ID for a new block
 * - createBlock<K>() — factory to create a typed block node with a new ID
 */

import type { BlockKind, BlockNode, BlockPropsMap } from "@repo/shared";
import { BLOCK_CATALOG_ENTRIES } from "@repo/shared";

let idCounter = 0;

export function resetIdCounter(): void {
  idCounter = 0;
}

export function createBlockId(kind?: BlockKind): string {
  const shortId = `${idCounter++}-${crypto.randomUUID().slice(0, 6)}`;
  const prefix = kind || "block";
  return `${prefix}-${shortId}`;
}

/**
 * Factory to create a new typed block node.
 * If props are omitted, loads default props from the block catalog.
 */
export function createBlock<K extends BlockKind>(
  kind: K,
  props?: BlockPropsMap[K],
): BlockNode<K> {
  const id = createBlockId(kind);

  let finalProps = props;
  if (!finalProps) {
    const entry = BLOCK_CATALOG_ENTRIES.find((e) => e.kind === kind);
    finalProps = (entry?.createDefaultProps() ?? {}) as BlockPropsMap[K];
  }

  return {
    id,
    kind,
    props: finalProps,
  };
}
