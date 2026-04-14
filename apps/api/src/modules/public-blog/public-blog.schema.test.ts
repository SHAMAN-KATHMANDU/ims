import { describe, it, expect } from "vitest";
import {
  FeaturedQuerySchema,
  ListPublicPostsQuerySchema,
} from "./public-blog.schema";

describe("ListPublicPostsQuerySchema", () => {
  it("applies defaults", () => {
    const result = ListPublicPostsQuerySchema.parse({});
    expect(result).toEqual({ page: 1, limit: 12 });
  });

  it("coerces string query params", () => {
    const result = ListPublicPostsQuerySchema.parse({
      page: "2",
      limit: "24",
      categorySlug: "stories",
    });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(24);
    expect(result.categorySlug).toBe("stories");
  });

  it("rejects limit above 50", () => {
    expect(() => ListPublicPostsQuerySchema.parse({ limit: "99" })).toThrow();
  });
});

describe("FeaturedQuerySchema", () => {
  it("defaults to 3", () => {
    expect(FeaturedQuerySchema.parse({}).limit).toBe(3);
  });

  it("caps at 12", () => {
    expect(() => FeaturedQuerySchema.parse({ limit: "99" })).toThrow();
  });
});
