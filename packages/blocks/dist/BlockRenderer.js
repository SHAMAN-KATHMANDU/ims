import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { blockRegistry } from "./registry";
export function BlockRenderer({ nodes, dataContext }) {
  if (!nodes || nodes.length === 0) return null;
  return _jsx(_Fragment, {
    children: nodes.map((node) => {
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
        node.children && node.children.length > 0
          ? _jsx(BlockRenderer, {
              nodes: node.children,
              dataContext: dataContext,
            })
          : null;
      return _jsx(
        "div",
        {
          "data-block-id": node.id,
          "data-block-kind": node.kind,
          children: _jsx(Component, {
            node: node,
            props: node.props,
            dataContext: dataContext,
            children: childrenElement,
          }),
        },
        node.id,
      );
    }),
  });
}
