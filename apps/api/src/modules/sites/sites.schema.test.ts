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

  it("accepts a valid currency code", () => {
    const result = UpdateSiteConfigSchema.parse({ currency: "INR" });
    expect(result.currency).toBe("INR");
  });

  it("uppercases + trims lowercase currency input", () => {
    const result = UpdateSiteConfigSchema.parse({ currency: "  usd  " });
    expect(result.currency).toBe("USD");
  });

  it("rejects too-short currency code", () => {
    expect(() => UpdateSiteConfigSchema.parse({ currency: "US" })).toThrow();
  });

  it("rejects too-long currency code", () => {
    expect(() =>
      UpdateSiteConfigSchema.parse({ currency: "TOOLONGCODE" }),
    ).toThrow();
  });

  it("rejects currency with non-alphanumeric chars", () => {
    expect(() => UpdateSiteConfigSchema.parse({ currency: "US$" })).toThrow();
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
