import { describe, it, expect } from "vitest";
import { EnableWebsiteSchema } from "./platform-websites.schema";

describe("EnableWebsiteSchema", () => {
  it("accepts empty body", () => {
    expect(EnableWebsiteSchema.parse({})).toEqual({});
  });

  it("accepts a templateSlug", () => {
    expect(EnableWebsiteSchema.parse({ templateSlug: "minimal" })).toEqual({
      templateSlug: "minimal",
    });
  });

  it("trims whitespace around templateSlug", () => {
    expect(EnableWebsiteSchema.parse({ templateSlug: "  luxury  " })).toEqual({
      templateSlug: "luxury",
    });
  });

  it("rejects empty templateSlug", () => {
    expect(() => EnableWebsiteSchema.parse({ templateSlug: "" })).toThrow();
  });

  it("rejects non-string templateSlug", () => {
    expect(() => EnableWebsiteSchema.parse({ templateSlug: 42 })).toThrow();
  });
});
