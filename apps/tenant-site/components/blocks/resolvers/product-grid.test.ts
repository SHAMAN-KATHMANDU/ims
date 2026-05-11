/**
 * Resolver-level tests for the ProductGrid block.
 *
 * Block components are async RSCs and unwieldy to render in vitest, but
 * the resolver is a pure async function — testing it in isolation gives
 * full coverage of the per-source dispatch logic without spinning up
 * React. The renderer's contract is "call this resolver, render the
 * result"; if the resolver is right, the rendered grid is right.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  getCollection: vi.fn(),
  getOffers: vi.fn(),
}));

import { getCollection, getOffers, type PublicProduct } from "@/lib/api";
import { resolveProductGridFromDataContext } from "./product-grid";
import type { BlockDataContext } from "../data-context";
import type { ProductGridProps } from "@repo/shared";

function ctx(overrides: Partial<BlockDataContext> = {}): BlockDataContext {
  return {
    site: { locale: "en", currency: "NPR" } as BlockDataContext["site"],
    host: "shop.example",
    tenantId: "t1",
    categories: [],
    navPages: [],
    products: [],
    featuredBlogPosts: [],
    ...overrides,
  };
}

function product(overrides: Partial<PublicProduct> = {}): PublicProduct {
  return {
    id: "p1",
    name: "Sample",
    description: null,
    imsCode: "SKU-1",
    mrp: "100",
    finalSp: "100",
    categoryId: "c1",
    subCategory: null,
    dateCreated: new Date().toISOString(),
    ...overrides,
  };
}

const baseProps: ProductGridProps = {
  source: "featured",
  limit: 4,
  columns: 3,
  cardVariant: "card",
};

describe("resolveProductGridFromDataContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("network sources", () => {
    it("source=offers calls getOffers and returns products", async () => {
      (getOffers as ReturnType<typeof vi.fn>).mockResolvedValue({
        products: [product({ id: "off-1" })],
      });
      const result = await resolveProductGridFromDataContext(
        { ...baseProps, source: "offers" },
        ctx(),
      );
      expect(getOffers).toHaveBeenCalledWith("shop.example", "t1", {
        limit: 4,
      });
      expect(result.map((p) => p.id)).toEqual(["off-1"]);
    });

    it("source=offers tolerates a null response", async () => {
      (getOffers as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const result = await resolveProductGridFromDataContext(
        { ...baseProps, source: "offers" },
        ctx(),
      );
      expect(result).toEqual([]);
    });

    it("source=collection without slug returns empty (avoids spurious fetch)", async () => {
      const result = await resolveProductGridFromDataContext(
        { ...baseProps, source: "collection" },
        ctx(),
      );
      expect(getCollection).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it("source=collection with slug calls getCollection", async () => {
      (getCollection as ReturnType<typeof vi.fn>).mockResolvedValue({
        collection: { products: [product({ id: "col-1" })] },
      });
      const result = await resolveProductGridFromDataContext(
        {
          ...baseProps,
          source: "collection",
          collectionSlug: "calm",
        },
        ctx(),
      );
      expect(getCollection).toHaveBeenCalledWith(
        "shop.example",
        "t1",
        "calm",
        4,
      );
      expect(result.map((p) => p.id)).toEqual(["col-1"]);
    });

    it("source=collection accepts the unwrapped legacy shape", async () => {
      // Older variants of getCollection returned the collection inline,
      // not under a `collection` key. The resolver must handle both.
      (getCollection as ReturnType<typeof vi.fn>).mockResolvedValue({
        products: [product({ id: "legacy-1" })],
      });
      const result = await resolveProductGridFromDataContext(
        {
          ...baseProps,
          source: "collection",
          collectionSlug: "legacy",
        },
        ctx(),
      );
      expect(result.map((p) => p.id)).toEqual(["legacy-1"]);
    });
  });

  describe("bulk-bag sources", () => {
    const all = [
      product({ id: "a", finalSp: "10", mrp: "20", dateCreated: "2024-01-01" }),
      product({ id: "b", finalSp: "30", mrp: "30", dateCreated: "2024-06-01" }),
      product({ id: "c", finalSp: "20", mrp: "20", dateCreated: "2024-03-01" }),
      product({
        id: "d",
        finalSp: "5",
        mrp: "10",
        categoryId: "cat-x",
        dateCreated: "2024-02-01",
      }),
    ];

    it("source=manual filters by productIds and preserves order", async () => {
      const result = await resolveProductGridFromDataContext(
        {
          ...baseProps,
          source: "manual",
          productIds: ["c", "a"],
          limit: 4,
        },
        ctx({ products: all }),
      );
      expect(result.map((p) => p.id)).toEqual(["c", "a"]);
    });

    it("source=category filters by categoryId", async () => {
      const result = await resolveProductGridFromDataContext(
        { ...baseProps, source: "category", categoryId: "cat-x", limit: 4 },
        ctx({ products: all }),
      );
      expect(result.map((p) => p.id)).toEqual(["d"]);
    });

    it("source=on-sale filters where finalSp < mrp", async () => {
      const result = await resolveProductGridFromDataContext(
        { ...baseProps, source: "on-sale", limit: 4 },
        ctx({ products: all }),
      );
      // a (10<20), d (5<10); b/c are full-price
      expect(result.map((p) => p.id).sort()).toEqual(["a", "d"]);
    });

    it("source=newest sorts dateCreated desc", async () => {
      const result = await resolveProductGridFromDataContext(
        { ...baseProps, source: "newest", limit: 4 },
        ctx({ products: all }),
      );
      expect(result.map((p) => p.id)).toEqual(["b", "c", "d", "a"]);
    });

    it("source=price-low sorts finalSp asc", async () => {
      const result = await resolveProductGridFromDataContext(
        { ...baseProps, source: "price-low", limit: 4 },
        ctx({ products: all }),
      );
      expect(result.map((p) => p.id)).toEqual(["d", "a", "c", "b"]);
    });

    it("respects the limit when slicing", async () => {
      const result = await resolveProductGridFromDataContext(
        { ...baseProps, source: "newest", limit: 2 },
        ctx({ products: all }),
      );
      expect(result).toHaveLength(2);
    });

    it("does NOT call network endpoints for bulk-bag sources", async () => {
      await resolveProductGridFromDataContext(
        { ...baseProps, source: "newest", limit: 2 },
        ctx({ products: all }),
      );
      expect(getOffers).not.toHaveBeenCalled();
      expect(getCollection).not.toHaveBeenCalled();
    });
  });
});
