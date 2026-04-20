import { describe, it, expect } from "vitest";
import {
  SlugSchema,
  CreateCollectionSchema,
  UpdateCollectionSchema,
  SetCollectionProductsSchema,
} from "./collections.schema";

describe("SlugSchema", () => {
  it("accepts lowercase-kebab slugs", () => {
    expect(SlugSchema.parse("featured")).toBe("featured");
    expect(SlugSchema.parse("top-picks")).toBe("top-picks");
    expect(SlugSchema.parse("a1-b2-c3")).toBe("a1-b2-c3");
  });

  it("trims whitespace before validating", () => {
    expect(SlugSchema.parse("  featured  ")).toBe("featured");
  });

  it("rejects uppercase letters", () => {
    expect(() => SlugSchema.parse("Featured")).toThrow();
  });

  it("rejects spaces, underscores, and leading/trailing hyphens", () => {
    expect(() => SlugSchema.parse("top picks")).toThrow();
    expect(() => SlugSchema.parse("top_picks")).toThrow();
    expect(() => SlugSchema.parse("-featured")).toThrow();
    expect(() => SlugSchema.parse("featured-")).toThrow();
  });

  it("rejects empty strings and slugs over 60 chars", () => {
    expect(() => SlugSchema.parse("")).toThrow();
    expect(() => SlugSchema.parse("a".repeat(61))).toThrow();
  });
});

describe("CreateCollectionSchema", () => {
  it("accepts a minimal slug + title payload", () => {
    const parsed = CreateCollectionSchema.parse({
      slug: "featured",
      title: "Featured",
    });
    expect(parsed.slug).toBe("featured");
    expect(parsed.title).toBe("Featured");
    expect(parsed.subtitle).toBeUndefined();
    expect(parsed.sort).toBeUndefined();
    expect(parsed.isActive).toBeUndefined();
  });

  it("accepts empty-string subtitle without throwing", () => {
    const parsed = CreateCollectionSchema.parse({
      slug: "featured",
      title: "Featured",
      subtitle: "",
    });
    expect(parsed.subtitle).toBe("");
  });

  it("keeps non-empty subtitle trimmed", () => {
    const parsed = CreateCollectionSchema.parse({
      slug: "featured",
      title: "Featured",
      subtitle: "  hand-picked  ",
    });
    expect(parsed.subtitle).toBe("hand-picked");
  });

  it("rejects empty title and sort out of range", () => {
    expect(() =>
      CreateCollectionSchema.parse({ slug: "featured", title: "" }),
    ).toThrow();
    expect(() =>
      CreateCollectionSchema.parse({
        slug: "featured",
        title: "Featured",
        sort: -1,
      }),
    ).toThrow();
    expect(() =>
      CreateCollectionSchema.parse({
        slug: "featured",
        title: "Featured",
        sort: 1001,
      }),
    ).toThrow();
  });

  it("rejects invalid slug through SlugSchema", () => {
    expect(() =>
      CreateCollectionSchema.parse({ slug: "Featured!", title: "Featured" }),
    ).toThrow();
  });
});

describe("UpdateCollectionSchema", () => {
  it("accepts a partial patch with a single field", () => {
    expect(UpdateCollectionSchema.parse({ title: "New Title" })).toEqual({
      title: "New Title",
    });
    expect(UpdateCollectionSchema.parse({ isActive: false })).toEqual({
      isActive: false,
    });
  });

  it("accepts null subtitle to clear the field", () => {
    expect(UpdateCollectionSchema.parse({ subtitle: null })).toEqual({
      subtitle: null,
    });
  });

  it("rejects an empty patch (refine: at least one field required)", () => {
    expect(() => UpdateCollectionSchema.parse({})).toThrow();
  });

  it("rejects invalid field values", () => {
    expect(() => UpdateCollectionSchema.parse({ slug: "BadSlug" })).toThrow();
    expect(() => UpdateCollectionSchema.parse({ title: "" })).toThrow();
    expect(() => UpdateCollectionSchema.parse({ sort: 99999 })).toThrow();
  });
});

describe("SetCollectionProductsSchema", () => {
  it("accepts an empty array (clear membership)", () => {
    expect(SetCollectionProductsSchema.parse({ productIds: [] })).toEqual({
      productIds: [],
    });
  });

  it("accepts a list of uuid productIds", () => {
    const ids = [
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
    ];
    expect(SetCollectionProductsSchema.parse({ productIds: ids })).toEqual({
      productIds: ids,
    });
  });

  it("rejects non-uuid productIds", () => {
    expect(() =>
      SetCollectionProductsSchema.parse({ productIds: ["not-a-uuid"] }),
    ).toThrow();
  });

  it("rejects arrays longer than 200", () => {
    const tooMany = Array.from(
      { length: 201 },
      (_, i) => `11111111-1111-1111-1111-${String(i).padStart(12, "0")}`,
    );
    expect(() =>
      SetCollectionProductsSchema.parse({ productIds: tooMany }),
    ).toThrow();
  });
});
