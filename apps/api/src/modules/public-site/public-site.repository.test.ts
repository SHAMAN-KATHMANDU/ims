import { describe, it, expect, vi, beforeEach } from "vitest";

// Configurable prisma client stub — tests override the method bodies per case.
// `vi.hoisted` lets this object be referenced inside the hoisted `vi.mock`
// factory and also inside test bodies below.
const prismaMock = vi.hoisted(() => ({
  product: {
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
    aggregate: vi.fn(),
  },
  productCollection: {
    findMany: vi.fn(),
  },
  productVariationAttribute: {
    findMany: vi.fn(),
  },
  vendor: {
    findMany: vi.fn(),
  },
  category: {
    findMany: vi.fn(),
  },
}));
vi.mock("@/config/prisma", () => ({ default: prismaMock }));

// sitesRepo.findConfig is unrelated to list-row shape tests — stub it out
// so the repository module loads without pulling in the real implementation.
vi.mock("@/modules/sites/sites.repository", () => ({
  default: { findConfig: vi.fn() },
}));

import { deriveDiscount, PublicSiteRepository } from "./public-site.repository";

describe("deriveDiscount", () => {
  it("returns no discount when finalSp equals mrp", () => {
    const r = deriveDiscount(100, 100, false);
    expect(r).toEqual({
      onOffer: false,
      discountPct: null,
      discountLabel: null,
    });
  });

  it("computes integer percent and label when finalSp < mrp", () => {
    const r = deriveDiscount(100, 75, false);
    expect(r).toEqual({
      onOffer: false,
      discountPct: 25,
      discountLabel: "25% OFF",
    });
  });

  it("rounds fractional percents to nearest integer", () => {
    // (100 - 67) / 100 = 33%.  (100 - 66) / 100 = 34.
    expect(deriveDiscount(100, 67, false).discountPct).toBe(33);
    expect(deriveDiscount(100, 66, false).discountPct).toBe(34);
  });

  it("returns onOffer=true without a price-based discount", () => {
    // Store sets finalSp = mrp but admin flagged an active offer.
    const r = deriveDiscount(100, 100, true);
    expect(r.onOffer).toBe(true);
    expect(r.discountPct).toBeNull();
    expect(r.discountLabel).toBeNull();
  });

  it("combines both signals", () => {
    const r = deriveDiscount(200, 150, true);
    expect(r).toEqual({
      onOffer: true,
      discountPct: 25,
      discountLabel: "25% OFF",
    });
  });

  it("handles mrp=0 gracefully (no divide-by-zero)", () => {
    const r = deriveDiscount(0, 0, false);
    expect(r.discountPct).toBeNull();
  });

  it("ignores negative finalSp and returns null", () => {
    const r = deriveDiscount(100, -10, false);
    expect(r.discountPct).toBeNull();
  });

  it("accepts Decimal-like string/number inputs", () => {
    const r = deriveDiscount("200.00", "150.00", false);
    expect(r.discountPct).toBe(25);
  });
});

beforeEach(() => {
  Object.values(prismaMock).forEach((group) => {
    Object.values(group).forEach((fn) => {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    });
  });
});

describe("PublicSiteRepository.listProducts payload", () => {
  const baseRow = {
    id: "p1",
    name: "Chair",
    imsCode: "C-001",
    mrp: { toString: () => "200" },
    finalSp: { toString: () => "150" },
    categoryId: "cat1",
    dateCreated: new Date("2026-01-01"),
    category: { id: "cat1", name: "Seating" },
    variations: [
      {
        finalSpOverride: null,
        mrpOverride: null,
        photos: [{ photoUrl: "https://cdn/img.jpg" }],
      },
    ],
    discounts: [],
  };

  it("does not return description or subCategory on list rows, and skips facet queries when not requested", async () => {
    prismaMock.product.findMany.mockResolvedValueOnce([baseRow]);
    prismaMock.product.count.mockResolvedValueOnce(1);

    const repo = new PublicSiteRepository();
    const [rows, total, facets] = await repo.listProducts("t1", {
      page: 1,
      limit: 10,
      includeFacets: false,
    });

    expect(total).toBe(1);
    expect(facets).toBeNull();
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row).not.toHaveProperty("description");
    expect(row).not.toHaveProperty("subCategory");
    // Selected fields still on the wire contract.
    expect(row).toMatchObject({
      id: "p1",
      name: "Chair",
      imsCode: "C-001",
      categoryId: "cat1",
      photoUrl: "https://cdn/img.jpg",
    });
    // Prisma select must not request the dropped scalar columns.
    const selectArg = prismaMock.product.findMany.mock.calls[0]![0].select;
    expect(selectArg).not.toHaveProperty("description");
    expect(selectArg).not.toHaveProperty("subCategory");
    // And the three facet queries were not issued.
    expect(prismaMock.product.groupBy).not.toHaveBeenCalled();
    expect(prismaMock.product.aggregate).not.toHaveBeenCalled();
    expect(
      prismaMock.productVariationAttribute.findMany,
    ).not.toHaveBeenCalled();
  });

  it("computes facets when includeFacets=true", async () => {
    prismaMock.product.findMany.mockResolvedValueOnce([]);
    prismaMock.product.count.mockResolvedValueOnce(0);
    prismaMock.product.groupBy.mockResolvedValueOnce([]);
    prismaMock.product.aggregate.mockResolvedValueOnce({
      _min: { finalSp: null },
      _max: { finalSp: null },
    });
    prismaMock.productVariationAttribute.findMany.mockResolvedValueOnce([]);

    const repo = new PublicSiteRepository();
    const [, , facets] = await repo.listProducts("t1", {
      page: 1,
      limit: 10,
      includeFacets: true,
    });

    expect(facets).toEqual({
      brands: [],
      priceMin: null,
      priceMax: null,
      attributes: [],
    });
    expect(prismaMock.product.groupBy).toHaveBeenCalledTimes(1);
    expect(prismaMock.product.aggregate).toHaveBeenCalledTimes(1);
    expect(prismaMock.productVariationAttribute.findMany).toHaveBeenCalledTimes(
      1,
    );
  });
});

describe("PublicSiteRepository.listCollectionProducts payload", () => {
  it("does not return description or subCategory on list rows", async () => {
    prismaMock.productCollection.findMany.mockResolvedValueOnce([
      { productId: "p1", position: 0 },
    ]);
    prismaMock.product.findMany.mockResolvedValueOnce([
      {
        id: "p1",
        name: "Chair",
        imsCode: "C-001",
        mrp: { toString: () => "200" },
        finalSp: { toString: () => "150" },
        categoryId: "cat1",
        dateCreated: new Date("2026-01-01"),
        category: null,
        variations: [],
        discounts: [],
      },
    ]);

    const repo = new PublicSiteRepository();
    const rows = await repo.listCollectionProducts("t1", "col1", 10);
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty("description");
    expect(rows[0]).not.toHaveProperty("subCategory");
    const selectArg = prismaMock.product.findMany.mock.calls.at(-1)![0].select;
    expect(selectArg).not.toHaveProperty("description");
    expect(selectArg).not.toHaveProperty("subCategory");
  });
});
