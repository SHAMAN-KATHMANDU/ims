import type { BlockNode } from "@repo/shared";
import { blockRegistry } from "./registry";
import type { BlockDataContext } from "./types";

export interface BlockRendererProps {
  nodes: BlockNode[] | null | undefined;
  dataContext: BlockDataContext;
}

export function BlockRenderer({ nodes, dataContext }: BlockRendererProps) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <>
      {nodes.map((node) => {
        const entry = blockRegistry[node.kind];
        if (!entry) {
          if (
            typeof process !== "undefined" &&
            process.env?.NODE_ENV !== "production"
          ) {
            // eslint-disable-next-line no-console
            console.warn(`[BlockRenderer] unknown block kind: ${node.kind}`);
          }
          return null;
        }

        const Component = entry.component;
        const childrenElement =
          node.children && node.children.length > 0 ? (
            <BlockRenderer nodes={node.children} dataContext={dataContext} />
          ) : null;

        return (
          <div
            key={node.id}
            data-block-id={node.id}
            data-block-kind={node.kind}
          >
            <Component node={node} props={node.props} dataContext={dataContext}>
              {childrenElement}
            </Component>
          </div>
        );
      })}
    </>
  );
}
