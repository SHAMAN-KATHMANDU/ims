import { describe, it, expect } from "vitest";
import { readSections } from "./sections";

describe("readSections", () => {
  it("returns safe defaults for null features", () => {
    const s = readSections(null);
    expect(s.hero).toBe(true);
    expect(s.products).toBe(true);
    expect(s.articles).toBe(true);
    expect(s.categories).toBe(true);
    expect(s.story).toBe(false);
    expect(s.lookbook).toBe(false);
    expect(s.extra).toEqual({});
  });

  it("returns safe defaults for empty object", () => {
    const s = readSections({});
    expect(s.hero).toBe(true);
    expect(s.products).toBe(true);
  });

  it("respects explicit false", () => {
    const s = readSections({ hero: false, products: false });
    expect(s.hero).toBe(false);
    expect(s.products).toBe(false);
  });

  it("respects explicit true for opt-in sections", () => {
    const s = readSections({ story: true, lookbook: true, trust: true });
    expect(s.story).toBe(true);
    expect(s.lookbook).toBe(true);
    expect(s.trust).toBe(true);
  });

  it("coerces string 'true' and 'false'", () => {
    const s = readSections({ hero: "false", story: "true" } as Record<
      string,
      unknown
    >);
    expect(s.hero).toBe(false);
    expect(s.story).toBe(true);
  });

  it("ignores garbage values and falls back to defaults", () => {
    const s = readSections({ hero: "weird", story: 42 } as Record<
      string,
      unknown
    >);
    expect(s.hero).toBe(true); // default
    expect(s.story).toBe(false); // default
  });

  it("preserves unknown keys under extra", () => {
    const s = readSections({
      hero: true,
      customBlock: true,
      whateverElse: "yes",
    });
    expect(s.extra.customBlock).toBe(true);
    expect(s.extra.whateverElse).toBe("yes");
  });

  it("does not leak known keys into extra", () => {
    const s = readSections({ hero: true, story: true });
    expect(Object.keys(s.extra)).toHaveLength(0);
  });
});
