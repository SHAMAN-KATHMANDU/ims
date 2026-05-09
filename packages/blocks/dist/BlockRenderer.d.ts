import type { BlockNode } from "@repo/shared";
import type { BlockDataContext } from "./types";
export interface BlockRendererProps {
  nodes: BlockNode[] | null | undefined;
  dataContext: BlockDataContext;
}
export declare function BlockRenderer({
  nodes,
  dataContext,
}: BlockRendererProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=BlockRenderer.d.ts.map
