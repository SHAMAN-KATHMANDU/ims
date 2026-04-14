import { describe, it, expect } from "vitest";
import {
  CreateTenantPageSchema,
  ListTenantPagesQuerySchema,
  ReorderPagesSchema,
  UpdateTenantPageSchema,
  RESERVED_SLUGS,
} from "./pages.schema";

describe("CreateTenantPageSchema", () => {
  const valid = {
    slug: "about",
    title: "About us",
    bodyMarkdown: "# About\n\nHi",
  };

  it("accepts a minimal payload and applies defaults", () => {
    const result = CreateTenantPageSchema.parse(valid);
    expect(result.layoutVariant).toBe("default");
    expect(result.showInNav).toBe(true);
    expect(result.navOrder).toBe(0);
  });

  it("rejects reserved slugs", () => {
    for (const reserved of ["products", "blog", "contact", "api"]) {
      expect(() =>
        CreateTenantPageSchema.parse({ ...valid, slug: reserved }),
      ).toThrow();
    }
  });

  it("rejects invalid slug format", () => {
    expect(() =>
      CreateTenantPageSchema.parse({ ...valid, slug: "Not Valid" }),
    ).toThrow();
    expect(() =>
      CreateTenantPageSchema.parse({ ...valid, slug: "-starts-with-dash" }),
    ).toThrow();
  });

  it("rejects invalid layoutVariant", () => {
    expect(() =>
      CreateTenantPageSchema.parse({ ...valid, layoutVariant: "weird" }),
    ).toThrow();
  });

  it("accepts full-width and narrow layouts", () => {
    expect(
      CreateTenantPageSchema.parse({ ...valid, layoutVariant: "full-width" })
        .layoutVariant,
    ).toBe("full-width");
    expect(
      CreateTenantPageSchema.parse({ ...valid, layoutVariant: "narrow" })
        .layoutVariant,
    ).toBe("narrow");
  });
});

describe("UpdateTenantPageSchema", () => {
  it("requires at least one field", () => {
    expect(() => UpdateTenantPageSchema.parse({})).toThrow();
  });

  it("accepts a showInNav toggle", () => {
    const result = UpdateTenantPageSchema.parse({ showInNav: false });
    expect(result.showInNav).toBe(false);
  });
});

describe("ListTenantPagesQuerySchema", () => {
  it("coerces published query param", () => {
    const result = ListTenantPagesQuerySchema.parse({ published: "true" });
    expect(result.published).toBe(true);
  });
});

describe("ReorderPagesSchema", () => {
  it("accepts an ordered list", () => {
    const result = ReorderPagesSchema.parse({
      order: [
        { id: "11111111-1111-1111-1111-111111111111", navOrder: 0 },
        { id: "22222222-2222-2222-2222-222222222222", navOrder: 1 },
      ],
    });
    expect(result.order).toHaveLength(2);
  });

  it("rejects non-uuid ids", () => {
    expect(() =>
      ReorderPagesSchema.parse({ order: [{ id: "not-uuid", navOrder: 0 }] }),
    ).toThrow();
  });
});

describe("RESERVED_SLUGS sanity", () => {
  it("contains the built-in routes", () => {
    expect(RESERVED_SLUGS.has("products")).toBe(true);
    expect(RESERVED_SLUGS.has("blog")).toBe(true);
    expect(RESERVED_SLUGS.has("contact")).toBe(true);
    expect(RESERVED_SLUGS.has("api")).toBe(true);
  });
});
