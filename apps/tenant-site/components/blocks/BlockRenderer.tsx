/**
 * BlockRenderer — recursive server component that walks a block tree and
 * renders each node via the block registry.
 *
 * Design notes:
 *   - Unknown block kinds render nothing (forward-compat).
 *   - Per-block visibility emits `tb-hide-mobile`/`tb-hide-tablet`/
 *     `tb-hide-desktop` classes consumed by globals.css media queries.
 *   - `style` overrides translate to inline CSS variables scoped by
 *     `data-block-id`. Phase 7 extends the mapping; Phase 3 keeps it
 *     minimal.
 *   - Container blocks (`section`, `columns`) render children themselves,
 *     so for those we DO NOT auto-render `node.children` here. The registry
 *     component marks itself container with a `container: true` flag.
 *   - `dataContext` is threaded into every block component so blocks can
 *     read already-fetched site data without making their own round-trips.
 */

import type { BlockNode, BlockStyleOverride } from "@repo/shared";
import { blockRegistry } from "./registry";
import type { BlockDataContext } from "./data-context";

type BlockRendererProps = {
  nodes: BlockNode[] | null | undefined;
  dataContext: BlockDataContext;
};

function visibilityClass(node: BlockNode): string | undefined {
  const v = node.visibility;
  if (!v) return undefined;
  const classes: string[] = [];
  if (v.mobile === false) classes.push("tb-hide-mobile");
  if (v.tablet === false) classes.push("tb-hide-tablet");
  if (v.desktop === false) classes.push("tb-hide-desktop");
  return classes.length ? classes.join(" ") : undefined;
}

function styleVars(style: BlockStyleOverride | undefined): React.CSSProperties {
  if (!style) return {};
  const out: React.CSSProperties = {};
  if (style.backgroundToken) out.background = `var(--${style.backgroundToken})`;
  if (style.textToken) out.color = `var(--${style.textToken})`;
  if (style.alignment) out.textAlign = style.alignment;
  return out;
}

export function BlockRenderer({ nodes, dataContext }: BlockRendererProps) {
  if (!nodes || nodes.length === 0) return null;
  return (
    <>
      {nodes.map((node) => {
        const entry = blockRegistry[node.kind];
        if (!entry) {
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.warn(`[BlockRenderer] unknown block kind: ${node.kind}`);
          }
          return null;
        }
        const Component = entry.component;
        const className = visibilityClass(node);
        const wrapperStyle = styleVars(node.style);

        // Container blocks render their own children (e.g. `section` wraps
        // them in padding). Leaf blocks that don't use children get them
        // auto-rendered below.
        return (
          <div
            key={node.id}
            data-block-id={node.id}
            data-block-kind={node.kind}
            className={className}
            style={wrapperStyle}
          >
            <Component node={node} props={node.props} dataContext={dataContext}>
              {node.children && node.children.length > 0 ? (
                <BlockRenderer
                  nodes={node.children}
                  dataContext={dataContext}
                />
              ) : null}
            </Component>
            {/* Non-container blocks that still have children (edge case)
                — render them outside the component so composition still
                works without every block forwarding `children`. */}
            {!entry.container && node.children && node.children.length > 0 ? (
              <BlockRenderer nodes={node.children} dataContext={dataContext} />
            ) : null}
          </div>
        );
      })}
    </>
  );
}
