import { describe, it, expect } from "vitest";
import {
  SiteLayoutScopeEnum,
  UpsertSiteLayoutSchema,
  ListSiteLayoutsQuerySchema,
} from "./site-layouts.schema";

describe("SiteLayoutScopeEnum", () => {
  it.each([
    "header",
    "footer",
    "home",
    "products-index",
    "product-detail",
    "offers",
    "blog-index",
    "blog-post",
    "contact",
    "page",
    "404",
    "landing",
  ])("accepts valid scope %s", (scope) => {
    expect(() => SiteLayoutScopeEnum.parse(scope)).not.toThrow();
  });

  it("rejects an unknown scope", () => {
    expect(() => SiteLayoutScopeEnum.parse("dashboard")).toThrow();
  });
});

describe("UpsertSiteLayoutSchema", () => {
  const minimalBlocks: never[] = [];

  it("accepts home scope without pageId", () => {
    const result = UpsertSiteLayoutSchema.parse({
      scope: "home",
      blocks: minimalBlocks,
    });
    expect(result.scope).toBe("home");
    expect(result.pageId).toBeUndefined();
  });

  it("accepts page scope with a valid UUID pageId", () => {
    const result = UpsertSiteLayoutSchema.parse({
      scope: "page",
      pageId: "00000000-0000-0000-0000-000000000001",
      blocks: minimalBlocks,
    });
    expect(result.scope).toBe("page");
    expect(result.pageId).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("rejects page scope without pageId", () => {
    expect(() =>
      UpsertSiteLayoutSchema.parse({ scope: "page", blocks: minimalBlocks }),
    ).toThrow(/pageId is required/);
  });

  it("rejects non-page scope when pageId is provided", () => {
    expect(() =>
      UpsertSiteLayoutSchema.parse({
        scope: "home",
        pageId: "00000000-0000-0000-0000-000000000001",
        blocks: minimalBlocks,
      }),
    ).toThrow(/pageId is only allowed/);
  });

  it("rejects invalid pageId format (not a UUID)", () => {
    expect(() =>
      UpsertSiteLayoutSchema.parse({
        scope: "page",
        pageId: "not-a-uuid",
        blocks: minimalBlocks,
      }),
    ).toThrow();
  });

  it("rejects invalid scope", () => {
    expect(() =>
      UpsertSiteLayoutSchema.parse({ scope: "unknown", blocks: minimalBlocks }),
    ).toThrow();
  });

  it("rejects missing blocks field", () => {
    expect(() => UpsertSiteLayoutSchema.parse({ scope: "home" })).toThrow();
  });

  it("rejects extra fields (strict mode)", () => {
    expect(() =>
      UpsertSiteLayoutSchema.parse({
        scope: "home",
        blocks: minimalBlocks,
        unexpected: true,
      }),
    ).toThrow();
  });

  it("accepts pageId: null on non-page scope as optional", () => {
    const result = UpsertSiteLayoutSchema.parse({
      scope: "home",
      pageId: null,
      blocks: minimalBlocks,
    });
    expect(result.pageId).toBeNull();
  });
});

describe("ListSiteLayoutsQuerySchema", () => {
  it("accepts empty query (no scope)", () => {
    const result = ListSiteLayoutsQuerySchema.parse({});
    expect(result.scope).toBeUndefined();
  });

  it("accepts a valid scope", () => {
    const result = ListSiteLayoutsQuerySchema.parse({ scope: "home" });
    expect(result.scope).toBe("home");
  });

  it("rejects an invalid scope", () => {
    expect(() =>
      ListSiteLayoutsQuerySchema.parse({ scope: "invalid" }),
    ).toThrow();
  });

  it("rejects extra fields (strict mode)", () => {
    expect(() =>
      ListSiteLayoutsQuerySchema.parse({ scope: "home", extra: "bad" }),
    ).toThrow();
  });
});
