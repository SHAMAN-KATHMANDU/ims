import { describe, it, expect } from "vitest";
import {
  CreateBlogCategorySchema,
  CreateBlogPostSchema,
  ListBlogPostsQuerySchema,
  UpdateBlogPostSchema,
  computeReadingMinutes,
} from "./blog.schema";

describe("CreateBlogPostSchema", () => {
  const valid = {
    slug: "hello-world",
    title: "Hello world",
    bodyMarkdown: "# Hello\n\nBody",
  };

  it("accepts a minimal payload", () => {
    const result = CreateBlogPostSchema.parse(valid);
    expect(result.slug).toBe("hello-world");
    expect(result.tags).toEqual([]);
  });

  it("rejects invalid slugs", () => {
    expect(() =>
      CreateBlogPostSchema.parse({ ...valid, slug: "Hello World" }),
    ).toThrow();
    expect(() =>
      CreateBlogPostSchema.parse({ ...valid, slug: "-starts-with-dash" }),
    ).toThrow();
  });

  it("rejects empty titles", () => {
    expect(() => CreateBlogPostSchema.parse({ ...valid, title: "" })).toThrow();
  });

  it("allows optional SEO + hero fields", () => {
    const result = CreateBlogPostSchema.parse({
      ...valid,
      excerpt: "Intro",
      heroImageUrl: "https://cdn.example.com/hero.jpg",
      authorName: "Jane",
      seoTitle: "Hello",
      seoDescription: "An intro post",
      tags: ["welcome", "intro"],
    });
    expect(result.tags).toEqual(["welcome", "intro"]);
  });

  it("caps tags at 20", () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    expect(() => CreateBlogPostSchema.parse({ ...valid, tags })).toThrow();
  });

  it("accepts a body block tree without bodyMarkdown", () => {
    const result = CreateBlogPostSchema.parse({
      slug: "block-post",
      title: "Block post",
      body: [{ id: "h-1", kind: "heading", props: { text: "Hi", level: 2 } }],
    });
    expect(result.body).toHaveLength(1);
  });

  it("rejects when neither bodyMarkdown nor body is provided", () => {
    expect(() =>
      CreateBlogPostSchema.parse({ slug: "no-body", title: "No body" }),
    ).toThrow();
    expect(() =>
      CreateBlogPostSchema.parse({
        slug: "empty-body",
        title: "Empty body",
        body: [],
      }),
    ).toThrow();
  });

  it("accepts a scheduledPublishAt ISO timestamp", () => {
    const result = CreateBlogPostSchema.parse({
      ...valid,
      scheduledPublishAt: "2026-12-01T00:00:00.000Z",
    });
    expect(result.scheduledPublishAt).toBe("2026-12-01T00:00:00.000Z");
  });
});

describe("UpdateBlogPostSchema", () => {
  it("requires at least one field", () => {
    expect(() => UpdateBlogPostSchema.parse({})).toThrow();
  });

  it("accepts a single-field update", () => {
    const result = UpdateBlogPostSchema.parse({ title: "New title" });
    expect(result.title).toBe("New title");
  });
});

describe("ListBlogPostsQuerySchema", () => {
  it("applies defaults", () => {
    const result = ListBlogPostsQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("coerces string query params", () => {
    const result = ListBlogPostsQuerySchema.parse({ page: "3", limit: "50" });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it("rejects unknown status values", () => {
    expect(() => ListBlogPostsQuerySchema.parse({ status: "WEIRD" })).toThrow();
  });
});

describe("CreateBlogCategorySchema", () => {
  it("accepts a minimal payload", () => {
    const result = CreateBlogCategorySchema.parse({
      slug: "stories",
      name: "Stories",
    });
    expect(result.slug).toBe("stories");
  });
});

describe("computeReadingMinutes", () => {
  it("returns a 1-minute floor for very short posts", () => {
    expect(computeReadingMinutes("hello")).toBe(1);
  });

  it("scales with word count at 200 wpm", () => {
    const words = Array.from({ length: 600 }, () => "word").join(" ");
    expect(computeReadingMinutes(words)).toBe(3);
  });

  it("ignores fenced code blocks when counting", () => {
    const body = `Intro\n\n\`\`\`ts\n${"code ".repeat(500)}\n\`\`\`\n\nOutro`;
    // Only ~3 words of prose survive — still floored to 1 min.
    expect(computeReadingMinutes(body)).toBe(1);
  });
});
