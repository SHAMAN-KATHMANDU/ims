import { describe, it, expect } from "vitest";
import {
  TenantPageFormSchema,
  RESERVED_SLUGS,
  slugifyTitle,
  pageSeoPreview,
} from "./validation";

describe("TenantPageFormSchema", () => {
  const valid = {
    slug: "about",
    title: "About us",
    bodyMarkdown: "# Hi",
  };

  it("accepts a minimal payload and applies defaults", () => {
    const result = TenantPageFormSchema.parse(valid);
    expect(result.slug).toBe("about");
    expect(result.layoutVariant).toBe("default");
    expect(result.showInNav).toBe(true);
    expect(result.navOrder).toBe(0);
  });

  it("rejects reserved slugs", () => {
    for (const s of ["products", "blog", "contact", "api", "_next"]) {
      expect(() => TenantPageFormSchema.parse({ ...valid, slug: s })).toThrow();
    }
  });

  it("rejects invalid slug format", () => {
    expect(() =>
      TenantPageFormSchema.parse({ ...valid, slug: "Not Valid" }),
    ).toThrow();
    expect(() =>
      TenantPageFormSchema.parse({ ...valid, slug: "-bad" }),
    ).toThrow();
  });

  it("rejects empty title and empty body", () => {
    expect(() => TenantPageFormSchema.parse({ ...valid, title: "" })).toThrow();
    expect(() =>
      TenantPageFormSchema.parse({ ...valid, bodyMarkdown: "" }),
    ).toThrow();
  });

  it("accepts all three layout variants", () => {
    expect(
      TenantPageFormSchema.parse({ ...valid, layoutVariant: "full-width" })
        .layoutVariant,
    ).toBe("full-width");
    expect(
      TenantPageFormSchema.parse({ ...valid, layoutVariant: "narrow" })
        .layoutVariant,
    ).toBe("narrow");
  });

  it("rejects unknown layout variant", () => {
    expect(() =>
      TenantPageFormSchema.parse({ ...valid, layoutVariant: "weird" }),
    ).toThrow();
  });

  it("coerces navOrder from string", () => {
    const result = TenantPageFormSchema.parse({ ...valid, navOrder: "3" });
    expect(result.navOrder).toBe(3);
  });
});

describe("RESERVED_SLUGS", () => {
  it("contains the built-in routes", () => {
    expect(RESERVED_SLUGS.has("products")).toBe(true);
    expect(RESERVED_SLUGS.has("blog")).toBe(true);
    expect(RESERVED_SLUGS.has("contact")).toBe(true);
    expect(RESERVED_SLUGS.has("api")).toBe(true);
    expect(RESERVED_SLUGS.has("_next")).toBe(true);
  });
});

describe("slugifyTitle", () => {
  it("lowercases and dashes", () => {
    expect(slugifyTitle("Hello World!")).toBe("hello-world");
  });

  it("strips diacritics", () => {
    expect(slugifyTitle("Crème brûlée")).toBe("creme-brulee");
  });

  it("collapses runs of non-alphanumerics", () => {
    expect(slugifyTitle("Hello  --  World!!!")).toBe("hello-world");
  });

  it("caps at 80 chars", () => {
    const result = slugifyTitle("a".repeat(200));
    expect(result.length).toBeLessThanOrEqual(80);
  });
});

describe("pageSeoPreview", () => {
  it("falls back to title when seoTitle missing", () => {
    const r = pageSeoPreview({
      title: "About",
      seoTitle: "",
      seoDescription: "",
    });
    expect(r.title).toBe("About");
  });

  it("prefers explicit SEO fields", () => {
    const r = pageSeoPreview({
      title: "About",
      seoTitle: "Our story",
      seoDescription: "Founded 1998",
    });
    expect(r.title).toBe("Our story");
    expect(r.description).toBe("Founded 1998");
  });
});
