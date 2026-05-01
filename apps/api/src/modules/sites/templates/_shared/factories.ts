/**
 * Shared block factory helpers for all templates.
 *
 * These utilities simplify blueprint authoring by providing convenient
 * constructors for blocks with proper typing and ID generation.
 */

import type { BlockNode, BlockPropsMap } from "@repo/shared";

let counter = 0;

/**
 * Reset the block ID counter. Call at the start of each template's module
 * to ensure IDs are deterministic and start from a known state.
 */
export function resetIdCounter(): void {
  counter = 0;
}

/**
 * Generate a unique block ID with the given prefix.
 *
 * Example: nextId("hero") => "hero-1", "hero-2", ...
 */
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

/**
 * Construct a block node with automatic ID generation.
 *
 * Example:
 *   block("heading", { text: "Hello", level: 1 })
 *   // => { id: "heading-1", kind: "heading", props: { text: "Hello", level: 1 } }
 *
 * The idHint parameter becomes the prefix; if omitted, the kind is used.
 */
export function block<K extends keyof BlockPropsMap>(
  kind: K,
  props: BlockPropsMap[K],
  idHint?: string,
): BlockNode<K> {
  return {
    id: nextId(idHint ?? kind),
    kind,
    props,
  };
}
