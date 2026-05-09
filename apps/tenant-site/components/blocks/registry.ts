/**
 * Re-export the shared block registry from @repo/blocks.
 *
 * This prevents drift between the production renderer and the CMS editor.
 * All block implementations live in packages/blocks/src/components/, and
 * the registry is the single source of truth.
 *
 * BlockDataContext is tenant-site specific (defined locally), but component
 * implementations accept a generic BlockComponentProps that tenant-site
 * adapts at render time via BlockRenderer.
 */

export { blockRegistry } from "@repo/blocks";

// Redefine BlockComponentProps locally to use tenant-site's BlockDataContext
import type { ComponentType, ReactNode } from "react";
import type { BlockKind, BlockNode } from "@repo/shared";
import type { BlockDataContext } from "./data-context";

export type BlockComponent = ComponentType<BlockComponentProps<any>>;

export interface BlockRegistryEntry {
  component: BlockComponent;
  /** When true, the block renders its own `children`. */
  container?: boolean;
}

export interface BlockComponentProps<P = unknown> {
  node: BlockNode;
  props: P;
  dataContext: BlockDataContext;
  children?: ReactNode;
}
