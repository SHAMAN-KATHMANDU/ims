/**
 * Pure-function tests for the template autowire pass.
 *
 * These rules sit between the in-code blueprint constants and the
 * persisted SiteLayout rows — when they regress, every newly-applied
 * tenant inherits the wrong configuration. Cover each rule exhaustively
 * here so the apply path's own tests can stay focused on orchestration.
 */

import { describe, it, expect } from "vitest";
import {
  autowireBlockTree,
  type AutowireTenantContext,
} from "./template-autowire";
import type { BlockNode } from "@repo/shared";

const baseCtx: AutowireTenantContext = {
  collections: [
    { id: "c1", slug: "calm-skin", title: "Calm Skin" },
    { id: "c2", slug: "glow", title: "Glow" },
  ],
  bundles: [{ id: "b1", slug: "starter-kit", name: "Starter kit" }],
  tagToCollectionSlug: {
    calm: "calm-skin",
    glow: "glow",
  },
};

const empty: AutowireTenantContext = {
  collections: [],
  bundles: [],
};

function block(kind: string, props: Record<string, unknown>): BlockNode {
  return {
    id: `n-${kind}`,
    kind: kind as BlockNode["kind"],
    props,
  } as BlockNode;
}

describe("autowireBlockTree", () => {
  describe("product-grid", () => {
    it("binds collectionSlug to the first active collection when missing", () => {
      const tree = [block("product-grid", { source: "collection", limit: 4 })];
      const [out] = autowireBlockTree(tree, baseCtx);
      expect((out!.props as { collectionSlug?: string }).collectionSlug).toBe(
        "calm-skin",
      );
    });

    it("preserves an existing collectionSlug — never clobbers user intent", () => {
      const tree = [
        block("product-grid", {
          source: "collection",
          collectionSlug: "explicit-slug",
        }),
      ];
      const [out] = autowireBlockTree(tree, baseCtx);
      expect((out!.props as { collectionSlug?: string }).collectionSlug).toBe(
        "explicit-slug",
      );
    });

    it("falls back to source=featured when tenant has no collections", () => {
      const tree = [block("product-grid", { source: "collection", limit: 4 })];
      const [out] = autowireBlockTree(tree, empty);
      expect((out!.props as { source: string }).source).toBe("featured");
      expect((out!.props as { collectionSlug?: string }).collectionSlug).toBe(
        undefined,
      );
    });

    it("ignores product-grids whose source isn't 'collection'", () => {
      const tree = [block("product-grid", { source: "featured", limit: 8 })];
      const [out] = autowireBlockTree(tree, baseCtx);
      expect(out!.props).toEqual({ source: "featured", limit: 8 });
    });
  });

  describe("bundle-spotlight", () => {
    it("binds slug to first bundle when missing", () => {
      const tree = [block("bundle-spotlight", {})];
      const [out] = autowireBlockTree(tree, baseCtx);
      expect((out!.props as { slug?: string }).slug).toBe("starter-kit");
    });

    it("preserves a slug that the tenant already has", () => {
      const tree = [block("bundle-spotlight", { slug: "starter-kit" })];
      const [out] = autowireBlockTree(tree, baseCtx);
      expect((out!.props as { slug?: string }).slug).toBe("starter-kit");
    });

    it("rebinds when blueprint slug doesn't exist on the tenant", () => {
      const tree = [block("bundle-spotlight", { slug: "ghost-bundle" })];
      const [out] = autowireBlockTree(tree, baseCtx);
      expect((out!.props as { slug?: string }).slug).toBe("starter-kit");
    });

    it("leaves slug alone when the tenant has no bundles (editor will prompt)", () => {
      const tree = [block("bundle-spotlight", { slug: "ghost-bundle" })];
      const [out] = autowireBlockTree(tree, empty);
      expect((out!.props as { slug?: string }).slug).toBe("ghost-bundle");
    });
  });

  describe("collection-cards (manual mode tag rewrite)", () => {
    it("rewrites /products?tag=X CTAs to /collections/{matched-slug}", () => {
      const tree = [
        block("collection-cards", {
          source: "manual",
          cards: [
            { title: "Calm + repair", ctaHref: "/products?tag=calm" },
            { title: "Glow + tone", ctaHref: "/products?tag=glow" },
            // Unmatched tag — left alone.
            { title: "Hydrate", ctaHref: "/products?tag=hydrate" },
          ],
        }),
      ];
      const [out] = autowireBlockTree(tree, baseCtx);
      const cards = (out!.props as { cards: Array<{ ctaHref: string }> }).cards;
      expect(cards[0]?.ctaHref).toBe("/collections/calm-skin");
      expect(cards[1]?.ctaHref).toBe("/collections/glow");
      expect(cards[2]?.ctaHref).toBe("/products?tag=hydrate");
    });

    it("leaves source=auto blocks alone (resolver handles the data)", () => {
      const tree = [
        block("collection-cards", {
          source: "auto",
          cards: [{ title: "x", ctaHref: "/products?tag=calm" }],
        }),
      ];
      const [out] = autowireBlockTree(tree, baseCtx);
      const cards = (out!.props as { cards: Array<{ ctaHref: string }> }).cards;
      // No rewrite — the cards array isn't authoritative when source=auto
      expect(cards[0]?.ctaHref).toBe("/products?tag=calm");
    });

    it("no-op when there's no tag→collection map provided", () => {
      const tree = [
        block("collection-cards", {
          source: "manual",
          cards: [{ title: "x", ctaHref: "/products?tag=calm" }],
        }),
      ];
      const [out] = autowireBlockTree(tree, {
        collections: baseCtx.collections,
        bundles: baseCtx.bundles,
      });
      const cards = (out!.props as { cards: Array<{ ctaHref: string }> }).cards;
      expect(cards[0]?.ctaHref).toBe("/products?tag=calm");
    });
  });

  describe("recursion", () => {
    it("descends into children and rewrites nested IMS blocks", () => {
      const tree: BlockNode[] = [
        {
          id: "section",
          kind: "section",
          props: {},
          children: [
            block("product-grid", { source: "collection", limit: 4 }),
            block("bundle-spotlight", {}),
          ],
        } as BlockNode,
      ];
      const [section] = autowireBlockTree(tree, baseCtx);
      const [grid, bundle] = section!.children!;
      expect((grid!.props as { collectionSlug?: string }).collectionSlug).toBe(
        "calm-skin",
      );
      expect((bundle!.props as { slug?: string }).slug).toBe("starter-kit");
    });
  });

  describe("immutability", () => {
    it("does not mutate the input tree", () => {
      const original = block("product-grid", { source: "collection" });
      const tree = [original];
      const before = JSON.parse(JSON.stringify(tree));
      autowireBlockTree(tree, baseCtx);
      expect(tree).toEqual(before);
    });
  });
});
