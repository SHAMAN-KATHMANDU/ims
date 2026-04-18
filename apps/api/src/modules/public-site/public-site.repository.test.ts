import { describe, it, expect, vi, beforeEach } from "vitest";

// Configurable prisma client stub — tests override the method bodies per case.
// `vi.hoisted` lets this object be referenced inside the hoisted `vi.mock`
// factory and also inside test bodies below.
const prismaMock = vi.hoisted(() => ({
  product: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
    aggregate: vi.fn(),
  },
  productCollection: {
    findMany: vi.fn(),
  },
  productVariation: {
    findMany: vi.fn(),
  },
  productVariationAttribute: {
    findMany: vi.fn(),
  },
  saleItem: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  vendor: {
    findMany: vi.fn(),
  },
  category: {
    findMany: vi.fn(),
  },
  attributeType: {
    findMany: vi.fn(),
  },
  attributeValue: {
    findMany: vi.fn(),
  },
  productReview: {
    groupBy: vi.fn(),
    aggregate: vi.fn(),
  },
  // Tagged-template raw SQL; invoked by the refactored computeFacets.
  $queryRaw: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: prismaMock }));

// sitesRepo.findConfig is unrelated to list-row shape tests — stub it out
// so the repository module loads without pulling in the real implementation.
vi.mock("@/modules/sites/sites.repository", () => ({
  default: { findConfig: vi.fn() },
}));

import {
  deriveDiscount,
  PublicSiteRepository,
  PDP_PHOTO_CAP,
  BEST_SELLER_WINDOW_DAYS,
  FBT_WINDOW_DAYS,
  FBT_MAX_RESULTS,
} from "./public-site.repository";

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
    // Top-level vi.fn stubs (e.g. $queryRaw) — reset directly.
    if (typeof group === "function") {
      (group as ReturnType<typeof vi.fn>).mockReset();
      return;
    }
    Object.values(group).forEach((fn) => {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    });
  });
  // Defaults: no reviews anywhere. Tests that want to assert real ratings
  // override these explicitly.
  prismaMock.productReview.groupBy.mockResolvedValue([]);
  prismaMock.productReview.aggregate.mockResolvedValue({
    _avg: { rating: null },
    _count: { rating: 0 },
  });
  // Default: empty attribute-tuple scope so tests that don't override
  // $queryRaw explicitly behave as if nothing matched.
  prismaMock.$queryRaw.mockResolvedValue([]);
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
    // Rating stubs: always null until a reviews table exists, but present
    // on the wire so the tenant-site star-rating UI can bind to the final
    // contract today.
    expect(row.avgRating).toBeNull();
    expect(row.ratingCount).toBeNull();
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
    // product.findMany fires twice when facets are on: once for the page
    // rows, once for the facet-scope productId lookup. Both empty here.
    prismaMock.product.findMany
      .mockResolvedValueOnce([]) // page rows
      .mockResolvedValueOnce([]); // facet scope
    prismaMock.product.count.mockResolvedValueOnce(0);
    prismaMock.product.groupBy.mockResolvedValueOnce([]);
    prismaMock.product.aggregate.mockResolvedValueOnce({
      _min: { finalSp: null },
      _max: { finalSp: null },
    });
    prismaMock.attributeType.findMany.mockResolvedValueOnce([]);
    prismaMock.attributeValue.findMany.mockResolvedValueOnce([]);

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
    // Empty scope → raw attribute query is short-circuited, not issued.
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    expect(
      prismaMock.productVariationAttribute.findMany,
    ).not.toHaveBeenCalled();
  });
});

describe("PublicSiteRepository.computeFacets query shape", () => {
  it("does not touch productVariationAttribute.findMany any more — uses $queryRaw with DISTINCT", async () => {
    prismaMock.product.findMany
      .mockResolvedValueOnce([]) // page rows
      .mockResolvedValueOnce([{ id: "p1" }, { id: "p2" }]); // scope
    prismaMock.product.count.mockResolvedValueOnce(0);
    prismaMock.product.groupBy.mockResolvedValueOnce([]);
    prismaMock.product.aggregate.mockResolvedValueOnce({
      _min: { finalSp: null },
      _max: { finalSp: null },
    });
    prismaMock.$queryRaw.mockResolvedValueOnce([]);
    prismaMock.attributeType.findMany.mockResolvedValueOnce([]);
    prismaMock.attributeValue.findMany.mockResolvedValueOnce([]);

    const repo = new PublicSiteRepository();
    await repo.listProducts("t1", { page: 1, limit: 10, includeFacets: true });

    expect(
      prismaMock.productVariationAttribute.findMany,
    ).not.toHaveBeenCalled();
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    // The scope-fetching product.findMany query pulls only ids.
    const scopeCall = prismaMock.product.findMany.mock.calls[1]![0];
    expect(scopeCall.select).toEqual({ id: true });
    expect(scopeCall.where.tenantId).toBe("t1");
  });

  it("bulk-fetches AttributeType/Value meta by distinct ids once per facet call", async () => {
    prismaMock.product.findMany
      .mockResolvedValueOnce([]) // page rows
      .mockResolvedValueOnce([{ id: "p1" }, { id: "p2" }]); // scope
    prismaMock.product.count.mockResolvedValueOnce(0);
    prismaMock.product.groupBy.mockResolvedValueOnce([]);
    prismaMock.product.aggregate.mockResolvedValueOnce({
      _min: { finalSp: null },
      _max: { finalSp: null },
    });
    // Distinct (typeId, valueId, productId) tuples as Postgres would
    // return after DISTINCT. (typeId=color,valueId=red) lands for both
    // p1 and p2; attributeType/Value still see each id exactly once.
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        attributeTypeId: "type-color",
        attributeValueId: "val-red",
        productId: "p1",
      },
      {
        attributeTypeId: "type-color",
        attributeValueId: "val-red",
        productId: "p2",
      },
      {
        attributeTypeId: "type-size",
        attributeValueId: "val-m",
        productId: "p1",
      },
    ]);
    prismaMock.attributeType.findMany.mockResolvedValueOnce([
      { id: "type-color", name: "Color", code: "color", displayOrder: 1 },
      { id: "type-size", name: "Size", code: "size", displayOrder: 2 },
    ]);
    prismaMock.attributeValue.findMany.mockResolvedValueOnce([
      { id: "val-red", value: "Red", displayOrder: 1 },
      { id: "val-m", value: "M", displayOrder: 1 },
    ]);

    const repo = new PublicSiteRepository();
    const [, , facets] = await repo.listProducts("t1", {
      page: 1,
      limit: 10,
      includeFacets: true,
    });

    expect(prismaMock.attributeType.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.attributeValue.findMany).toHaveBeenCalledTimes(1);
    const typeCall = prismaMock.attributeType.findMany.mock.calls[0]![0];
    const valueCall = prismaMock.attributeValue.findMany.mock.calls[0]![0];
    // Distinct ids only — duplicate (type-color) collapses to one entry.
    expect(new Set(typeCall.where.id.in)).toEqual(
      new Set(["type-color", "type-size"]),
    );
    expect(new Set(valueCall.where.id.in)).toEqual(
      new Set(["val-red", "val-m"]),
    );

    expect(facets!.attributes).toEqual([
      {
        typeId: "type-color",
        typeName: "Color",
        typeCode: "color",
        values: [{ valueId: "val-red", value: "Red", count: 2 }],
      },
      {
        typeId: "type-size",
        typeName: "Size",
        typeCode: "size",
        values: [{ valueId: "val-m", value: "M", count: 1 }],
      },
    ]);
  });

  it("skips rows whose type or value metadata was deleted mid-flight", async () => {
    prismaMock.product.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "p1" }, { id: "p2" }]);
    prismaMock.product.count.mockResolvedValueOnce(0);
    prismaMock.product.groupBy.mockResolvedValueOnce([]);
    prismaMock.product.aggregate.mockResolvedValueOnce({
      _min: { finalSp: null },
      _max: { finalSp: null },
    });
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        attributeTypeId: "type-color",
        attributeValueId: "val-red",
        productId: "p1",
      },
      {
        attributeTypeId: "type-ghost",
        attributeValueId: "val-gone",
        productId: "p2",
      },
    ]);
    // type-ghost/val-gone weren't returned by the bulk meta fetch —
    // simulate a deletion racing with facet computation. Row is skipped.
    prismaMock.attributeType.findMany.mockResolvedValueOnce([
      { id: "type-color", name: "Color", code: "color", displayOrder: 1 },
    ]);
    prismaMock.attributeValue.findMany.mockResolvedValueOnce([
      { id: "val-red", value: "Red", displayOrder: 1 },
    ]);

    const repo = new PublicSiteRepository();
    const [, , facets] = await repo.listProducts("t1", {
      page: 1,
      limit: 10,
      includeFacets: true,
    });

    expect(facets!.attributes).toEqual([
      {
        typeId: "type-color",
        typeName: "Color",
        typeCode: "color",
        values: [{ valueId: "val-red", value: "Red", count: 1 }],
      },
    ]);
  });

  it("skips the raw attribute query entirely when the scope has no products", async () => {
    prismaMock.product.findMany
      .mockResolvedValueOnce([]) // page
      .mockResolvedValueOnce([]); // empty scope
    prismaMock.product.count.mockResolvedValueOnce(0);
    prismaMock.product.groupBy.mockResolvedValueOnce([]);
    prismaMock.product.aggregate.mockResolvedValueOnce({
      _min: { finalSp: null },
      _max: { finalSp: null },
    });
    prismaMock.attributeType.findMany.mockResolvedValueOnce([]);
    prismaMock.attributeValue.findMany.mockResolvedValueOnce([]);

    const repo = new PublicSiteRepository();
    const [, , facets] = await repo.listProducts("t1", {
      page: 1,
      limit: 10,
      includeFacets: true,
    });

    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    expect(facets!.attributes).toEqual([]);
  });
});

describe("PublicSiteRepository.findProduct photo cap", () => {
  it("caps per-variation photoUrls to PDP_PHOTO_CAP in the prisma select", async () => {
    prismaMock.product.findFirst.mockResolvedValueOnce({
      id: "p1",
      name: "Chair",
      description: "desc",
      imsCode: "C-001",
      mrp: { toString: () => "200" },
      finalSp: { toString: () => "150" },
      length: null,
      breadth: null,
      height: null,
      weight: null,
      categoryId: "cat1",
      subCategory: null,
      dateCreated: new Date("2026-01-01"),
      category: null,
      discounts: [],
      variations: [
        {
          id: "v1",
          finalSpOverride: null,
          mrpOverride: null,
          stockQuantity: 5,
          photos: Array.from({ length: PDP_PHOTO_CAP }, (_, i) => ({
            photoUrl: `https://cdn/${i}.jpg`,
          })),
          attributes: [],
          subVariations: [],
        },
      ],
    });

    const repo = new PublicSiteRepository();
    const detail = await repo.findProduct("t1", "p1");
    expect(detail).not.toBeNull();
    const selectArg = (prismaMock.product.findFirst as ReturnType<typeof vi.fn>)
      .mock.calls[0]![0].select;
    expect(selectArg.variations.select.photos.take).toBe(PDP_PHOTO_CAP);
    expect(detail!.variations[0]!.photoUrls).toHaveLength(PDP_PHOTO_CAP);
    // Top-level gallery (photoUrls) also bounded because it reads from
    // the first variation's already-capped photos array.
    expect(detail!.photoUrls.length).toBeLessThanOrEqual(PDP_PHOTO_CAP);
  });

  it("leaves short variation photo arrays intact", async () => {
    prismaMock.product.findFirst.mockResolvedValueOnce({
      id: "p1",
      name: "Chair",
      description: null,
      imsCode: "C-001",
      mrp: { toString: () => "200" },
      finalSp: { toString: () => "150" },
      length: null,
      breadth: null,
      height: null,
      weight: null,
      categoryId: "cat1",
      subCategory: null,
      dateCreated: new Date("2026-01-01"),
      category: null,
      discounts: [],
      variations: [
        {
          id: "v1",
          finalSpOverride: null,
          mrpOverride: null,
          stockQuantity: 5,
          photos: [{ photoUrl: "https://cdn/a.jpg" }],
          attributes: [],
          subVariations: [],
        },
      ],
    });

    const repo = new PublicSiteRepository();
    const detail = await repo.findProduct("t1", "p1");
    expect(detail!.variations[0]!.photoUrls).toEqual(["https://cdn/a.jpg"]);
  });

  it("ships avgRating/ratingCount as null on the detail payload (no reviews table yet)", async () => {
    prismaMock.product.findFirst.mockResolvedValueOnce({
      id: "p1",
      name: "Chair",
      description: null,
      imsCode: "C-001",
      mrp: { toString: () => "200" },
      finalSp: { toString: () => "150" },
      length: null,
      breadth: null,
      height: null,
      weight: null,
      categoryId: "cat1",
      subCategory: null,
      dateCreated: new Date("2026-01-01"),
      category: null,
      discounts: [],
      variations: [],
    });

    const repo = new PublicSiteRepository();
    const detail = await repo.findProduct("t1", "p1");
    expect(detail!.avgRating).toBeNull();
    expect(detail!.ratingCount).toBeNull();
  });

  it("ships real avgRating/ratingCount on the detail payload when APPROVED reviews exist", async () => {
    prismaMock.product.findFirst.mockResolvedValueOnce({
      id: "p1",
      name: "Chair",
      description: null,
      imsCode: "C-001",
      mrp: { toString: () => "200" },
      finalSp: { toString: () => "150" },
      length: null,
      breadth: null,
      height: null,
      weight: null,
      categoryId: "cat1",
      subCategory: null,
      dateCreated: new Date("2026-01-01"),
      category: null,
      discounts: [],
      variations: [],
    });
    prismaMock.productReview.aggregate.mockResolvedValueOnce({
      _avg: { rating: 4.33 },
      _count: { rating: 9 },
    });

    const repo = new PublicSiteRepository();
    const detail = await repo.findProduct("t1", "p1");
    // Rounded to one decimal (4.33 → 4.3), count is real.
    expect(detail!.avgRating).toBe(4.3);
    expect(detail!.ratingCount).toBe(9);
    // Aggregate query is tenant-scoped + APPROVED + not deleted.
    const aggArg = prismaMock.productReview.aggregate.mock.calls[0]![0];
    expect(aggArg.where).toMatchObject({
      tenantId: "t1",
      productId: "p1",
      status: "APPROVED",
      deletedAt: null,
    });
  });
});

describe("PublicSiteRepository.listProducts ratings overlay", () => {
  const baseRow = {
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
  };

  it("overlays real ratings from the groupBy batch", async () => {
    prismaMock.product.findMany.mockResolvedValueOnce([
      baseRow,
      { ...baseRow, id: "p2" },
    ]);
    prismaMock.product.count.mockResolvedValueOnce(2);
    prismaMock.productReview.groupBy.mockResolvedValueOnce([
      { productId: "p1", _avg: { rating: 4.5 }, _count: { rating: 4 } },
      // p2 has no groupBy row → falls back to NULL_RATINGS.
    ]);

    const repo = new PublicSiteRepository();
    const [rows] = await repo.listProducts("t1", {
      page: 1,
      limit: 10,
      includeFacets: false,
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: "p1", avgRating: 4.5, ratingCount: 4 });
    expect(rows[1]).toMatchObject({
      id: "p2",
      avgRating: null,
      ratingCount: null,
    });
    // groupBy query scoped to this tenant, APPROVED, not-deleted, keyed by productId.
    const groupArg = prismaMock.productReview.groupBy.mock.calls[0]![0];
    expect(groupArg.by).toEqual(["productId"]);
    expect(groupArg.where).toMatchObject({
      tenantId: "t1",
      status: "APPROVED",
      deletedAt: null,
    });
    expect(groupArg.where.productId.in).toEqual(["p1", "p2"]);
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

describe("PublicSiteRepository.listProducts best-selling sort", () => {
  function productRow(id: string) {
    return {
      id,
      name: `Product ${id}`,
      imsCode: `C-${id}`,
      mrp: { toString: () => "200" },
      finalSp: { toString: () => "150" },
      categoryId: "cat1",
      dateCreated: new Date("2026-01-01"),
      category: null,
      variations: [],
      discounts: [],
    };
  }

  it("ranks products by trailing-window sale-item count, with stable tie-breaker", async () => {
    // p1: 5 (variation v1) + 2 (variation v1b) = 7 total
    // p2: 10
    // p3: 7 — same as p1, id order breaks tie → p1 before p3
    prismaMock.saleItem.groupBy.mockResolvedValueOnce([
      { variationId: "v1", _count: { _all: 5 } },
      { variationId: "v1b", _count: { _all: 2 } },
      { variationId: "v2", _count: { _all: 10 } },
      { variationId: "v3", _count: { _all: 7 } },
    ]);
    prismaMock.productVariation.findMany.mockResolvedValueOnce([
      { id: "v1", productId: "p1" },
      { id: "v1b", productId: "p1" },
      { id: "v2", productId: "p2" },
      { id: "v3", productId: "p3" },
    ]);
    prismaMock.product.findMany.mockResolvedValueOnce([
      productRow("p1"),
      productRow("p2"),
      productRow("p3"),
    ]);

    const repo = new PublicSiteRepository();
    const [rows, total, facets] = await repo.listProducts("t1", {
      page: 1,
      limit: 10,
      sort: "best-selling",
      includeFacets: false,
    });

    expect(total).toBe(3);
    expect(facets).toBeNull();
    // p2 (10) > p1 (7) > p3 (7, lexicographic tie-break by id)
    expect(rows.map((r) => r.id)).toEqual(["p2", "p1", "p3"]);

    // SaleItem groupBy query is tenant-scoped, non-deleted, trailing window.
    const groupByArg = prismaMock.saleItem.groupBy.mock.calls[0]![0];
    expect(groupByArg.by).toEqual(["variationId"]);
    expect(groupByArg.where.sale.tenantId).toBe("t1");
    expect(groupByArg.where.sale.deletedAt).toBeNull();
    const since: Date = groupByArg.where.sale.createdAt.gte;
    const windowMs = BEST_SELLER_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    expect(Date.now() - since.getTime()).toBeGreaterThanOrEqual(
      windowMs - 1000,
    );
  });

  it("returns an empty page when no sales land in the window (no silent fallback to newest)", async () => {
    prismaMock.saleItem.groupBy.mockResolvedValueOnce([]);

    const repo = new PublicSiteRepository();
    const [rows, total, facets] = await repo.listProducts("t1", {
      page: 1,
      limit: 10,
      sort: "best-selling",
    });

    expect(rows).toEqual([]);
    expect(total).toBe(0);
    expect(facets).toBeNull();
    expect(prismaMock.productVariation.findMany).not.toHaveBeenCalled();
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
  });

  it("paginates the ranked list in memory (page 2 slices correctly)", async () => {
    prismaMock.saleItem.groupBy.mockResolvedValueOnce([
      { variationId: "v1", _count: { _all: 3 } },
      { variationId: "v2", _count: { _all: 2 } },
      { variationId: "v3", _count: { _all: 1 } },
    ]);
    prismaMock.productVariation.findMany.mockResolvedValueOnce([
      { id: "v1", productId: "p1" },
      { id: "v2", productId: "p2" },
      { id: "v3", productId: "p3" },
    ]);
    prismaMock.product.findMany.mockResolvedValueOnce([
      productRow("p1"),
      productRow("p2"),
      productRow("p3"),
    ]);

    const repo = new PublicSiteRepository();
    const [rows, total] = await repo.listProducts("t1", {
      page: 2,
      limit: 2,
      sort: "best-selling",
    });

    expect(total).toBe(3);
    // Page 1 would be [p1, p2]; page 2 is the tail [p3].
    expect(rows.map((r) => r.id)).toEqual(["p3"]);
  });

  it("intersects best-seller rank with the existing filter WHERE", async () => {
    prismaMock.saleItem.groupBy.mockResolvedValueOnce([
      { variationId: "v1", _count: { _all: 3 } },
    ]);
    prismaMock.productVariation.findMany.mockResolvedValueOnce([
      { id: "v1", productId: "p1" },
    ]);
    prismaMock.product.findMany.mockResolvedValueOnce([productRow("p1")]);

    const repo = new PublicSiteRepository();
    await repo.listProducts("t1", {
      page: 1,
      limit: 10,
      sort: "best-selling",
      categoryId: "cat-specific",
    });

    const whereArg = prismaMock.product.findMany.mock.calls[0]![0].where;
    expect(whereArg.categoryId).toBe("cat-specific");
    expect(whereArg.tenantId).toBe("t1");
    expect(whereArg.id).toEqual({ in: ["p1"] });
  });
});

describe("PublicSiteRepository.listFrequentlyBoughtWith", () => {
  function productRow(id: string) {
    return {
      id,
      name: `Product ${id}`,
      imsCode: `C-${id}`,
      mrp: { toString: () => "200" },
      finalSp: { toString: () => "150" },
      categoryId: "cat1",
      dateCreated: new Date("2026-01-01"),
      category: null,
      variations: [],
      discounts: [],
    };
  }

  it("ranks co-purchased products by distinct-sale count with stable tie-break and honors the window + tenant scope", async () => {
    // Target product "pTarget" shipped in sales s1..s3.
    prismaMock.saleItem.findMany
      .mockResolvedValueOnce([
        { saleId: "s1" },
        { saleId: "s2" },
        { saleId: "s3" },
      ])
      // Co-items: pA co-occurs in s1,s2,s3 (3 distinct); pB in s1,s2 (2);
      // pC in s3 only (1). Ties broken by productId asc.
      .mockResolvedValueOnce([
        { saleId: "s1", variationId: "vA" },
        { saleId: "s2", variationId: "vA" },
        { saleId: "s3", variationId: "vA2" },
        { saleId: "s1", variationId: "vB" },
        { saleId: "s2", variationId: "vB" },
        { saleId: "s3", variationId: "vC" },
        // Duplicate line within the same sale must NOT double-count.
        { saleId: "s1", variationId: "vB" },
      ]);
    prismaMock.productVariation.findMany.mockResolvedValueOnce([
      { id: "vA", productId: "pA" },
      { id: "vA2", productId: "pA" },
      { id: "vB", productId: "pB" },
      { id: "vC", productId: "pC" },
    ]);
    prismaMock.product.findMany.mockResolvedValueOnce([
      productRow("pA"),
      productRow("pB"),
      productRow("pC"),
    ]);

    const repo = new PublicSiteRepository();
    const result = await repo.listFrequentlyBoughtWith("t1", "pTarget");

    expect(result.map((r) => r.id)).toEqual(["pA", "pB", "pC"]);

    // 1st findMany: distinct saleIds for target + window + tenant scope.
    const targetArg = prismaMock.saleItem.findMany.mock.calls[0]![0];
    expect(targetArg.distinct).toEqual(["saleId"]);
    expect(targetArg.where.variation.productId).toBe("pTarget");
    expect(targetArg.where.variation.tenantId).toBe("t1");
    expect(targetArg.where.sale.tenantId).toBe("t1");
    expect(targetArg.where.sale.deletedAt).toBeNull();
    const since: Date = targetArg.where.sale.createdAt.gte;
    const windowMs = FBT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    expect(Date.now() - since.getTime()).toBeGreaterThanOrEqual(
      windowMs - 1000,
    );

    // 2nd findMany: excludes the target's own variations.
    const coArg = prismaMock.saleItem.findMany.mock.calls[1]![0];
    expect(coArg.where.saleId).toEqual({ in: ["s1", "s2", "s3"] });
    expect(coArg.where.variation.productId).toEqual({ not: "pTarget" });
    expect(coArg.where.variation.tenantId).toBe("t1");
  });

  it("returns [] when the target has no in-window sales (no silent fallback)", async () => {
    prismaMock.saleItem.findMany.mockResolvedValueOnce([]);

    const repo = new PublicSiteRepository();
    const result = await repo.listFrequentlyBoughtWith("t1", "pTarget");

    expect(result).toEqual([]);
    // Short-circuit: no co-item query, no product hydrate.
    expect(prismaMock.saleItem.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.productVariation.findMany).not.toHaveBeenCalled();
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
  });

  it("caps results at FBT_MAX_RESULTS", async () => {
    prismaMock.saleItem.findMany
      .mockResolvedValueOnce([{ saleId: "s1" }])
      .mockResolvedValueOnce(
        Array.from({ length: 15 }, (_, i) => ({
          saleId: "s1",
          variationId: `v${i}`,
        })),
      );
    prismaMock.productVariation.findMany.mockResolvedValueOnce(
      Array.from({ length: 15 }, (_, i) => ({
        id: `v${i}`,
        productId: `p${String(i).padStart(2, "0")}`,
      })),
    );
    prismaMock.product.findMany.mockResolvedValueOnce(
      Array.from({ length: 15 }, (_, i) =>
        productRow(`p${String(i).padStart(2, "0")}`),
      ),
    );

    const repo = new PublicSiteRepository();
    const result = await repo.listFrequentlyBoughtWith("t1", "pTarget");

    expect(result).toHaveLength(FBT_MAX_RESULTS);
  });
});
