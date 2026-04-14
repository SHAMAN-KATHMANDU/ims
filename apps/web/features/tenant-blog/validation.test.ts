import { describe, it, expect } from "vitest";
import {
  BlogPostFormSchema,
  BlogCategoryFormSchema,
  slugifyTitle,
  parseTagInput,
  seoPreview,
} from "./validation";

describe("BlogPostFormSchema", () => {
  const valid = {
    slug: "hello-world",
    title: "Hello world",
    bodyMarkdown: "# Hello",
    tags: [],
  };

  it("accepts a minimal payload", () => {
    const result = BlogPostFormSchema.parse(valid);
    expect(result.slug).toBe("hello-world");
  });

  it("rejects invalid slug", () => {
    expect(() =>
      BlogPostFormSchema.parse({ ...valid, slug: "Hello World" }),
    ).toThrow();
  });

  it("rejects empty title", () => {
    expect(() => BlogPostFormSchema.parse({ ...valid, title: "" })).toThrow();
  });

  it("allows empty heroImageUrl", () => {
    const result = BlogPostFormSchema.parse({ ...valid, heroImageUrl: "" });
    expect(result.heroImageUrl).toBeUndefined();
  });

  it("rejects invalid heroImageUrl", () => {
    expect(() =>
      BlogPostFormSchema.parse({ ...valid, heroImageUrl: "not-a-url" }),
    ).toThrow();
  });

  it("accepts valid heroImageUrl", () => {
    const result = BlogPostFormSchema.parse({
      ...valid,
      heroImageUrl: "https://cdn.example.com/hero.jpg",
    });
    expect(result.heroImageUrl).toBe("https://cdn.example.com/hero.jpg");
  });
});

describe("BlogCategoryFormSchema", () => {
  it("accepts a valid payload", () => {
    const result = BlogCategoryFormSchema.parse({
      slug: "stories",
      name: "Stories",
    });
    expect(result.slug).toBe("stories");
  });

  it("coerces sortOrder from string", () => {
    const result = BlogCategoryFormSchema.parse({
      slug: "stories",
      name: "Stories",
      sortOrder: "10",
    });
    expect(result.sortOrder).toBe(10);
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

  it("trims leading/trailing dashes", () => {
    expect(slugifyTitle("!!Hello!!")).toBe("hello");
  });

  it("caps at 80 characters", () => {
    const title = "a".repeat(200);
    expect(slugifyTitle(title).length).toBeLessThanOrEqual(80);
  });
});

describe("parseTagInput", () => {
  it("splits on commas", () => {
    expect(parseTagInput("welcome, intro, story")).toEqual([
      "welcome",
      "intro",
      "story",
    ]);
  });

  it("lowercases and deduplicates", () => {
    expect(parseTagInput("Welcome, WELCOME, welcome")).toEqual(["welcome"]);
  });

  it("replaces spaces inside a tag with dashes", () => {
    expect(parseTagInput("spring 2026, launch")).toEqual([
      "spring-2026",
      "launch",
    ]);
  });

  it("drops empty entries", () => {
    expect(parseTagInput(",,welcome,,")).toEqual(["welcome"]);
  });

  it("caps at 20 tags", () => {
    const input = Array.from({ length: 25 }, (_, i) => `t${i}`).join(",");
    expect(parseTagInput(input)).toHaveLength(20);
  });

  it("drops tags longer than 40 chars", () => {
    expect(parseTagInput(`${"a".repeat(41)},ok`)).toEqual(["ok"]);
  });
});

describe("seoPreview", () => {
  it("falls back to title when seoTitle missing", () => {
    const result = seoPreview({
      title: "Hello",
      excerpt: "",
      seoTitle: "",
      seoDescription: "",
    });
    expect(result.title).toBe("Hello");
  });

  it("falls back to excerpt when seoDescription missing", () => {
    const result = seoPreview({
      title: "Hello",
      excerpt: "Intro",
      seoTitle: "",
      seoDescription: "",
    });
    expect(result.description).toBe("Intro");
  });

  it("prefers explicit SEO fields", () => {
    const result = seoPreview({
      title: "Hello",
      excerpt: "Intro",
      seoTitle: "Hi world",
      seoDescription: "Custom desc",
    });
    expect(result.title).toBe("Hi world");
    expect(result.description).toBe("Custom desc");
  });
});
