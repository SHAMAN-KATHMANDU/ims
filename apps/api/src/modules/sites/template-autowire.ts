/**
 * Template autowire — rewrite freshly-seeded block trees so IMS-aware
 * blocks (product-grid, bundle-spotlight, collection-cards manual links)
 * point at real tenant rows instead of placeholder slugs/queries from
 * the blueprint. Runs once during pickTemplate, after BlockTreeSchema
 * validation, before persist.
 *
 * Why a separate module: the rewrite rules are pure (block + tenantCtx
 * → block) and deserve unit tests that don't spin up the DB. Keeping
 * them out of sites.service.ts also keeps the apply flow readable —
 * sites.service.ts orchestrates seeds, this module decides what to
 * write into each block.
 *
 * Behavioural invariants:
 *   - Never mutates input. Returns new BlockNode arrays/objects so the
 *     caller can compare and detect rewrites for telemetry.
 *   - Never invents data. If the tenant has no collections, blocks stay
 *     unwired and surface their "pick a collection" empty-state in the
 *     editor instead of inventing fake refs.
 *   - Recursive into `children` so blocks nested inside section/columns
 *     get the same treatment.
 */

import type { BlockNode } from "@repo/shared";

export interface AutowireTenantContext {
  /** Active collections in their canonical sort order. */
  collections: Array<{ id: string; slug: string; title: string }>;
  /** Active bundles in their canonical sort order. */
  bundles: Array<{ id: string; slug: string; name: string }>;
  /**
   * Optional tag → collection slug map. Lets the blueprint's placeholder
   * `/products?tag=calm` CTAs resolve to a real `/collections/calm-skin`
   * link when the tenant happens to have a calmly-named collection.
   * Lookup is case-insensitive on the tag.
   */
  tagToCollectionSlug?: Record<string, string>;
}

/**
 * Walk the tree, rewriting every node where applicable. Returns the
 * rewritten tree (always a new array — input untouched).
 */
export function autowireBlockTree(
  tree: BlockNode[],
  ctx: AutowireTenantContext,
): BlockNode[] {
  return tree.map((node) => autowireNode(node, ctx));
}

function autowireNode(node: BlockNode, ctx: AutowireTenantContext): BlockNode {
  const rewritten = applyRules(node, ctx);
  if (!rewritten.children || rewritten.children.length === 0) {
    return rewritten;
  }
  return {
    ...rewritten,
    children: rewritten.children.map((child) => autowireNode(child, ctx)),
  };
}

function applyRules(node: BlockNode, ctx: AutowireTenantContext): BlockNode {
  const rule = RULES[node.kind];
  if (!rule) return node;
  return rule(node, ctx);
}

type RuleFn = (node: BlockNode, ctx: AutowireTenantContext) => BlockNode;

/**
 * Wrap node mutation in a single helper so the rule body stays focused on
 * the data decision; the cast lives in one place. Block schemas are typed
 * by `kind`, but the autowire pass deliberately works on the open
 * `props` shape because it doesn't know which specific kind it's
 * touching at compile time (the registry lookup is by string).
 */
function withProps(node: BlockNode, patch: Record<string, unknown>): BlockNode {
  return {
    ...node,
    props: { ...(node.props as Record<string, unknown>), ...patch },
  } as BlockNode;
}

const RULES: Partial<Record<string, RuleFn>> = {
  "product-grid": (node, ctx) => {
    const props = node.props as Record<string, unknown>;
    if (props.source !== "collection") return node;
    if (typeof props.collectionSlug === "string" && props.collectionSlug) {
      return node;
    }
    const first = ctx.collections[0];
    if (!first) {
      // No collections yet — fall back to "featured" so the grid still
      // renders something instead of an empty section.
      return withProps(node, { source: "featured" });
    }
    return withProps(node, { collectionSlug: first.slug });
  },

  "bundle-spotlight": (node, ctx) => {
    const props = node.props as Record<string, unknown>;
    const existing = typeof props.slug === "string" ? props.slug.trim() : "";
    if (existing.length > 0) {
      const known = ctx.bundles.find((b) => b.slug === existing);
      if (known) return node;
    }
    const first = ctx.bundles[0];
    if (!first) return node;
    return withProps(node, { slug: first.slug });
  },

  "collection-cards": (node, ctx) => {
    const props = node.props as Record<string, unknown>;
    if (props.source === "auto") return node;
    const cards = props.cards;
    if (!Array.isArray(cards) || cards.length === 0) return node;
    if (!ctx.tagToCollectionSlug) return node;

    let changed = false;
    const rewritten = cards.map((card) => {
      if (!card || typeof card !== "object") return card;
      const cardObj = card as Record<string, unknown>;
      const href = cardObj.ctaHref;
      if (typeof href !== "string") return card;
      const tagSlug = extractTagFromQuery(href);
      if (!tagSlug) return card;
      const collectionSlug = ctx.tagToCollectionSlug?.[tagSlug.toLowerCase()];
      if (!collectionSlug) return card;
      changed = true;
      return { ...cardObj, ctaHref: `/collections/${collectionSlug}` };
    });
    if (!changed) return node;
    return withProps(node, { cards: rewritten });
  },
};

/**
 * Pull the `tag` query parameter from a placeholder href like
 * `/products?tag=calm`. Returns null when the URL is anything else
 * (a real path, an external link, a hash anchor, etc.) so the rule
 * leaves user content alone.
 */
function extractTagFromQuery(href: string): string | null {
  if (!href.startsWith("/products?")) return null;
  const qs = href.slice("/products?".length);
  const params = new URLSearchParams(qs);
  const tag = params.get("tag");
  return tag && tag.length > 0 ? tag : null;
}
