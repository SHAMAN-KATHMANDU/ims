import { describe, it, expect } from "vitest";
import {
  ListProductsQuerySchema,
  ListReviewsPublicQuerySchema,
  SubmitReviewSchema,
} from "./public-site.schema";

describe("ListProductsQuerySchema", () => {
  it("defaults page=1 and limit=24 on empty query", () => {
    const result = ListProductsQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(24);
  });

  it("coerces string page/limit from query strings", () => {
    const result = ListProductsQuerySchema.parse({
      page: "3",
      limit: "48",
    });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(48);
  });

  it("accepts categoryId filter", () => {
    const result = ListProductsQuerySchema.parse({
      categoryId: "11111111-1111-1111-1111-111111111111",
    });
    expect(result.categoryId).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("rejects non-uuid categoryId", () => {
    expect(() =>
      ListProductsQuerySchema.parse({ categoryId: "not-a-uuid" }),
    ).toThrow();
  });

  it("caps limit at 100", () => {
    expect(() => ListProductsQuerySchema.parse({ limit: "500" })).toThrow();
  });

  it("rejects page < 1", () => {
    expect(() => ListProductsQuerySchema.parse({ page: "0" })).toThrow();
  });

  it("trims search and rejects empty string", () => {
    expect(() => ListProductsQuerySchema.parse({ search: "  " })).toThrow();
    const result = ListProductsQuerySchema.parse({ search: "  chair " });
    expect(result.search).toBe("chair");
  });

  describe("sort", () => {
    it("accepts best-selling as a valid sort", () => {
      const result = ListProductsQuerySchema.parse({ sort: "best-selling" });
      expect(result.sort).toBe("best-selling");
    });

    it("accepts rating as a valid sort", () => {
      const result = ListProductsQuerySchema.parse({ sort: "rating" });
      expect(result.sort).toBe("rating");
    });

    it("rejects unknown sort values", () => {
      expect(() => ListProductsQuerySchema.parse({ sort: "random" })).toThrow();
    });
  });

  describe("includeFacets", () => {
    it("defaults to false when omitted", () => {
      const result = ListProductsQuerySchema.parse({});
      expect(result.includeFacets).toBe(false);
    });

    it('coerces "1" / "true" / "yes" (case-insensitive) to true', () => {
      expect(
        ListProductsQuerySchema.parse({ includeFacets: "1" }).includeFacets,
      ).toBe(true);
      expect(
        ListProductsQuerySchema.parse({ includeFacets: "true" }).includeFacets,
      ).toBe(true);
      expect(
        ListProductsQuerySchema.parse({ includeFacets: "TRUE" }).includeFacets,
      ).toBe(true);
      expect(
        ListProductsQuerySchema.parse({ includeFacets: "yes" }).includeFacets,
      ).toBe(true);
    });

    it('coerces "0" / "false" / arbitrary strings to false', () => {
      expect(
        ListProductsQuerySchema.parse({ includeFacets: "0" }).includeFacets,
      ).toBe(false);
      expect(
        ListProductsQuerySchema.parse({ includeFacets: "false" }).includeFacets,
      ).toBe(false);
      expect(
        ListProductsQuerySchema.parse({ includeFacets: "nope" }).includeFacets,
      ).toBe(false);
    });

    it("accepts raw booleans", () => {
      expect(
        ListProductsQuerySchema.parse({ includeFacets: true }).includeFacets,
      ).toBe(true);
      expect(
        ListProductsQuerySchema.parse({ includeFacets: false }).includeFacets,
      ).toBe(false);
    });
  });
});

describe("ListReviewsPublicQuerySchema", () => {
  it("defaults page=1 and limit=10 on empty query", () => {
    const result = ListReviewsPublicQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it("coerces string page/limit", () => {
    const result = ListReviewsPublicQuerySchema.parse({
      page: "2",
      limit: "25",
    });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(25);
  });

  it("caps limit at 50", () => {
    expect(() =>
      ListReviewsPublicQuerySchema.parse({ limit: "500" }),
    ).toThrow();
  });
});

describe("SubmitReviewSchema", () => {
  it("accepts a minimal rating-only payload", () => {
    const result = SubmitReviewSchema.parse({ rating: 5 });
    expect(result.rating).toBe(5);
    expect(result.body).toBeUndefined();
    expect(result.authorName).toBeUndefined();
    expect(result.authorEmail).toBeUndefined();
  });

  it("coerces numeric strings to int rating", () => {
    const result = SubmitReviewSchema.parse({ rating: "4" });
    expect(result.rating).toBe(4);
  });

  it("rejects rating below 1 or above 5", () => {
    expect(() => SubmitReviewSchema.parse({ rating: 0 })).toThrow();
    expect(() => SubmitReviewSchema.parse({ rating: 6 })).toThrow();
  });

  it("trims body and empty-string collapses to undefined", () => {
    expect(
      SubmitReviewSchema.parse({ rating: 5, body: "  great  " }).body,
    ).toBe("great");
    expect(
      SubmitReviewSchema.parse({ rating: 5, body: "" }).body,
    ).toBeUndefined();
  });

  it("rejects body longer than 2000 chars", () => {
    expect(() =>
      SubmitReviewSchema.parse({ rating: 5, body: "x".repeat(2001) }),
    ).toThrow();
  });

  it("rejects malformed email but accepts omission", () => {
    expect(() =>
      SubmitReviewSchema.parse({ rating: 5, authorEmail: "not-an-email" }),
    ).toThrow();
    const ok = SubmitReviewSchema.parse({ rating: 5 });
    expect(ok.authorEmail).toBeUndefined();
  });

  it("accepts empty-string author fields as undefined", () => {
    const result = SubmitReviewSchema.parse({
      rating: 5,
      authorName: "",
      authorEmail: "",
    });
    expect(result.authorName).toBeUndefined();
    expect(result.authorEmail).toBeUndefined();
  });
});
