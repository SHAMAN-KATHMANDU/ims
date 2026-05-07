/**
 * Single source of truth: which block kinds render children.
 *
 * Kept in sync with apps/tenant-site/components/blocks/registry.ts.
 * Any file that traverses the tree or checks isContainer() imports from here.
 */

import type { BlockKind } from "@repo/shared";

export const CONTAINER_KINDS = [
  "section",
  "row",
  "columns",
  "css-grid",
] as const;

export type ContainerKind = (typeof CONTAINER_KINDS)[number];

export function isContainerKind(kind: BlockKind): kind is ContainerKind {
  return CONTAINER_KINDS.includes(kind as ContainerKind);
}
