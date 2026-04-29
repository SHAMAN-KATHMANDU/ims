import { describe, it, expect } from "vitest";
import {
  UpdateSiteConfigSchema,
  PickTemplateSchema,
  AnalyticsSchema,
} from "./sites.schema";

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

describe("AnalyticsSchema", () => {
  it("accepts a valid GA4 measurement ID", () => {
    const result = AnalyticsSchema.parse({ ga4MeasurementId: "G-ABC123" });
    expect(result.ga4MeasurementId).toBe("G-ABC123");
  });

  it("accepts a valid GTM container ID", () => {
    const result = AnalyticsSchema.parse({ gtmContainerId: "GTM-XYZ123" });
    expect(result.gtmContainerId).toBe("GTM-XYZ123");
  });

  it("accepts a valid Meta Pixel ID", () => {
    const result = AnalyticsSchema.parse({ metaPixelId: "123456789012" });
    expect(result.metaPixelId).toBe("123456789012");
  });

  it("defaults consentMode to 'basic'", () => {
    const result = AnalyticsSchema.parse({});
    expect(result.consentMode).toBe("basic");
  });

  it("accepts consentMode 'granted'", () => {
    const result = AnalyticsSchema.parse({ consentMode: "granted" });
    expect(result.consentMode).toBe("granted");
  });

  it("rejects invalid GA4 ID (lowercase)", () => {
    expect(() =>
      AnalyticsSchema.parse({ ga4MeasurementId: "g-abc123" }),
    ).toThrow();
  });

  it("rejects invalid GA4 ID (missing G- prefix)", () => {
    expect(() =>
      AnalyticsSchema.parse({ ga4MeasurementId: "ABC123" }),
    ).toThrow();
  });

  it("rejects invalid GTM ID (wrong prefix)", () => {
    expect(() =>
      AnalyticsSchema.parse({ gtmContainerId: "GM-XYZ123" }),
    ).toThrow();
  });

  it("rejects Meta Pixel ID that is too short (fewer than 6 digits)", () => {
    expect(() => AnalyticsSchema.parse({ metaPixelId: "12345" })).toThrow();
  });

  it("rejects Meta Pixel ID with non-numeric characters", () => {
    expect(() => AnalyticsSchema.parse({ metaPixelId: "12345abc" })).toThrow();
  });

  it("transforms empty string GA4 ID to undefined", () => {
    const result = AnalyticsSchema.parse({ ga4MeasurementId: "" });
    expect(result.ga4MeasurementId).toBeUndefined();
  });

  it("transforms empty string GTM ID to undefined", () => {
    const result = AnalyticsSchema.parse({ gtmContainerId: "" });
    expect(result.gtmContainerId).toBeUndefined();
  });

  it("transforms empty string Pixel ID to undefined", () => {
    const result = AnalyticsSchema.parse({ metaPixelId: "" });
    expect(result.metaPixelId).toBeUndefined();
  });

  it("accepts all three trackers at once", () => {
    const result = AnalyticsSchema.parse({
      ga4MeasurementId: "G-ABC123",
      gtmContainerId: "GTM-XYZ123",
      metaPixelId: "123456789012",
      consentMode: "granted",
    });
    expect(result.ga4MeasurementId).toBe("G-ABC123");
    expect(result.gtmContainerId).toBe("GTM-XYZ123");
    expect(result.metaPixelId).toBe("123456789012");
    expect(result.consentMode).toBe("granted");
  });
});
