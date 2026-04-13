import { describe, it, expect } from "vitest";
import { UpdateSiteConfigSchema, PickTemplateSchema } from "./sites.schema";

describe("UpdateSiteConfigSchema", () => {
  it("accepts a partial branding update", () => {
    const result = UpdateSiteConfigSchema.parse({
      branding: { colors: { primary: "#000" } },
    });
    expect(result.branding).toEqual({ colors: { primary: "#000" } });
    expect(result.contact).toBeUndefined();
  });

  it("accepts all four fields at once", () => {
    const payload = {
      branding: { theme: "dark" },
      contact: { email: "x@y.com" },
      features: { hero: true },
      seo: { title: "Home" },
    };
    const result = UpdateSiteConfigSchema.parse(payload);
    expect(result).toEqual(payload);
  });

  it("accepts null to clear a field", () => {
    const result = UpdateSiteConfigSchema.parse({ branding: null });
    expect(result.branding).toBeNull();
  });

  it("rejects an empty object (must have at least one field)", () => {
    expect(() => UpdateSiteConfigSchema.parse({})).toThrow();
  });

  it("rejects non-object branding", () => {
    expect(() =>
      UpdateSiteConfigSchema.parse({ branding: "not an object" }),
    ).toThrow();
  });
});

describe("PickTemplateSchema", () => {
  it("accepts a slug and defaults resetBranding to false", () => {
    const result = PickTemplateSchema.parse({ templateSlug: "minimal" });
    expect(result.templateSlug).toBe("minimal");
    expect(result.resetBranding).toBe(false);
  });

  it("accepts resetBranding=true", () => {
    const result = PickTemplateSchema.parse({
      templateSlug: "luxury",
      resetBranding: true,
    });
    expect(result.resetBranding).toBe(true);
  });

  it("trims slug whitespace", () => {
    const result = PickTemplateSchema.parse({
      templateSlug: "  standard  ",
    });
    expect(result.templateSlug).toBe("standard");
  });

  it("rejects empty slug", () => {
    expect(() => PickTemplateSchema.parse({ templateSlug: "" })).toThrow();
  });

  it("rejects missing slug", () => {
    expect(() => PickTemplateSchema.parse({})).toThrow();
  });
});
