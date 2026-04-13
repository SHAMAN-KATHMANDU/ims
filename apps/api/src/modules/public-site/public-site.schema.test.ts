import { describe, it, expect } from "vitest";
import { ListProductsQuerySchema } from "./public-site.schema";

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
});
