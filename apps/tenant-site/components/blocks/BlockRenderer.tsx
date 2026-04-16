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

import type {
  BlockNode,
  BlockResponsiveOverrides,
  BlockStyleOverride,
} from "@repo/shared";
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

/**
 * Merge responsive overrides into base props. Returns the merged props
 * for a specific device, or the base props if no override exists.
 */
function mergeResponsiveProps(
  baseProps: unknown,
  overrides: Record<string, unknown> | undefined,
): unknown {
  if (!overrides || Object.keys(overrides).length === 0) return baseProps;
  return { ...(baseProps as Record<string, unknown>), ...overrides };
}

/**
 * Check if a node has responsive overrides that differ from base props.
 */
function hasResponsiveOverrides(
  responsive: BlockResponsiveOverrides | undefined,
): boolean {
  if (!responsive) return false;
  const mobileKeys = Object.keys(responsive.mobile ?? {});
  const tabletKeys = Object.keys(responsive.tablet ?? {});
  return mobileKeys.length > 0 || tabletKeys.length > 0;
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

        const childrenElement =
          node.children && node.children.length > 0 ? (
            <BlockRenderer nodes={node.children} dataContext={dataContext} />
          ) : null;

        // If the block has responsive overrides, render device-specific
        // versions using CSS display toggling. The desktop version shows
        // base props; mobile/tablet versions merge their overrides.
        if (hasResponsiveOverrides(node.responsive)) {
          const mobileProps = mergeResponsiveProps(
            node.props,
            node.responsive?.mobile,
          );
          const tabletProps = mergeResponsiveProps(
            node.props,
            node.responsive?.tablet,
          );

          return (
            <div
              key={node.id}
              data-block-id={node.id}
              data-block-kind={node.kind}
            >
              {/* Desktop version (hidden on mobile + tablet) */}
              <div
                className={`tb-hide-mobile tb-hide-tablet ${className ?? ""}`}
                style={wrapperStyle}
              >
                <Component
                  node={node}
                  props={node.props}
                  dataContext={dataContext}
                >
                  {childrenElement}
                </Component>
              </div>
              {/* Tablet version (hidden on desktop + mobile) */}
              {node.responsive?.tablet && (
                <div
                  className={`tb-hide-desktop tb-hide-mobile ${className ?? ""}`}
                  style={wrapperStyle}
                >
                  <Component
                    node={{ ...node, props: tabletProps as typeof node.props }}
                    props={tabletProps}
                    dataContext={dataContext}
                  >
                    {childrenElement}
                  </Component>
                </div>
              )}
              {/* Mobile version (hidden on desktop + tablet) */}
              {node.responsive?.mobile && (
                <div
                  className={`tb-hide-desktop tb-hide-tablet ${className ?? ""}`}
                  style={wrapperStyle}
                >
                  <Component
                    node={{ ...node, props: mobileProps as typeof node.props }}
                    props={mobileProps}
                    dataContext={dataContext}
                  >
                    {childrenElement}
                  </Component>
                </div>
              )}
            </div>
          );
        }

        // Standard rendering (no responsive overrides)
        return (
          <div
            key={node.id}
            data-block-id={node.id}
            data-block-kind={node.kind}
            className={className}
            style={wrapperStyle}
          >
            <Component node={node} props={node.props} dataContext={dataContext}>
              {childrenElement}
            </Component>
            {!entry.container && node.children && node.children.length > 0 ? (
              <BlockRenderer nodes={node.children} dataContext={dataContext} />
            ) : null}
          </div>
        );
      })}
    </>
  );
}
