import { describe, it, expect } from "vitest";
import {
  BrandingFormSchema,
  ContactFormSchema,
  SeoFormSchema,
  brandingFromJson,
  brandingToJson,
  contactFromJson,
  contactToJson,
  seoFromJson,
  seoToJson,
} from "./validation";

describe("BrandingFormSchema", () => {
  // Identity fields (name/tagline/logoUrl/faviconUrl) moved to
  // TenantBusinessProfile — they are no longer part of this schema.
  it("accepts a full valid design-token payload", () => {
    const result = BrandingFormSchema.parse({
      primaryColor: "#1E40AF",
      accentColor: "#F59E0B",
      theme: "light",
      headingFont: "Playfair Display",
      radius: "soft",
      sectionPadding: "balanced",
    });
    expect(result.primaryColor).toBe("#1E40AF");
    expect(result.theme).toBe("light");
  });

  it("accepts empty strings for all optional color/font fields", () => {
    expect(() =>
      BrandingFormSchema.parse({
        primaryColor: "",
        accentColor: "",
        headingFont: "",
        bodyFont: "",
      }),
    ).not.toThrow();
  });

  it("rejects non-hex primaryColor", () => {
    expect(() => BrandingFormSchema.parse({ primaryColor: "blue" })).toThrow();
  });
});

describe("branding serialization round-trip", () => {
  it("brandingFromJson handles null/missing fields", () => {
    const result = brandingFromJson(null);
    expect(result.primaryColor).toBe("");
    expect(result.theme).toBe("light");
  });

  it("brandingFromJson reads colors.primary/accent", () => {
    const result = brandingFromJson({
      colors: { primary: "#111", accent: "#222" },
      theme: "dark",
    });
    expect(result.primaryColor).toBe("#111");
    expect(result.accentColor).toBe("#222");
    expect(result.theme).toBe("dark");
  });

  it("brandingToJson strips empty strings and nests colors", () => {
    const result = brandingToJson({
      primaryColor: "#111",
      accentColor: "#222",
      theme: "dark",
    });
    expect(result).toEqual({
      theme: "dark",
      colors: { primary: "#111", accent: "#222" },
    });
  });

  it("brandingToJson omits colors entirely when neither is set", () => {
    const result = brandingToJson({
      primaryColor: "",
      accentColor: "",
      theme: "light",
    });
    expect(result.colors).toBeUndefined();
  });
});

describe("ContactFormSchema", () => {
  it("accepts valid payload", () => {
    expect(() =>
      ContactFormSchema.parse({
        email: "hello@acme.com",
        phone: "+977 98xxx",
        address: "Kathmandu",
        mapUrl: "https://maps.example.com/",
      }),
    ).not.toThrow();
  });

  it("rejects invalid email", () => {
    expect(() => ContactFormSchema.parse({ email: "not-an-email" })).toThrow();
  });

  it("accepts empty email (optional)", () => {
    expect(() => ContactFormSchema.parse({ email: "" })).not.toThrow();
  });
});

describe("contact serialization", () => {
  it("contactToJson strips empty strings", () => {
    const result = contactToJson({
      email: "hello@acme.com",
      phone: "",
      address: "Kathmandu",
      mapUrl: "",
    });
    expect(result).toEqual({
      email: "hello@acme.com",
      address: "Kathmandu",
    });
  });

  it("contactFromJson handles null", () => {
    const result = contactFromJson(null);
    expect(result.email).toBe("");
  });
});

describe("SeoFormSchema", () => {
  it("accepts valid payload", () => {
    expect(() =>
      SeoFormSchema.parse({
        title: "Home",
        description: "Acme store",
        keywords: "furniture, kathmandu",
        ogImage: "https://example.com/og.png",
      }),
    ).not.toThrow();
  });

  it("rejects invalid ogImage URL", () => {
    expect(() => SeoFormSchema.parse({ ogImage: "not a url" })).toThrow();
  });
});

describe("seo serialization", () => {
  it("seoToJson strips empty strings", () => {
    const result = seoToJson({
      title: "Home",
      description: "",
      keywords: "",
      ogImage: "",
    });
    expect(result).toEqual({ title: "Home" });
  });

  it("seoFromJson handles null", () => {
    const result = seoFromJson(null);
    expect(result.title).toBe("");
  });
});

// ============================================
// Phase C.5 — full design-token surface
// ============================================

describe("BrandingFormSchema — C.5 design tokens", () => {
  it("accepts all 9 color tokens", () => {
    const r = BrandingFormSchema.parse({
      primaryColor: "#111",
      secondaryColor: "#333",
      accentColor: "#fa0",
      backgroundColor: "#fff",
      surfaceColor: "#fafafa",
      textColor: "#000",
      mutedColor: "#888",
      borderColor: "#ddd",
      ringColor: "#111",
    });
    expect(r.secondaryColor).toBe("#333");
    expect(r.surfaceColor).toBe("#fafafa");
    expect(r.ringColor).toBe("#111");
  });

  it("rejects non-hex color values", () => {
    expect(() => BrandingFormSchema.parse({ surfaceColor: "red" })).toThrow();
  });

  it("accepts typography scale ratio and base font size", () => {
    const r = BrandingFormSchema.parse({
      headingFont: "Inter",
      bodyFont: "Inter",
      displayFont: "Playfair Display",
      scaleRatio: 1.333,
      baseFontSize: 17,
    });
    expect(r.scaleRatio).toBe(1.333);
    expect(r.baseFontSize).toBe(17);
  });

  it("rejects scale ratio out of bounds", () => {
    expect(() => BrandingFormSchema.parse({ scaleRatio: 0.5 })).toThrow();
    expect(() => BrandingFormSchema.parse({ scaleRatio: 3 })).toThrow();
  });

  it("rejects base font size out of bounds", () => {
    expect(() => BrandingFormSchema.parse({ baseFontSize: 8 })).toThrow();
    expect(() => BrandingFormSchema.parse({ baseFontSize: 40 })).toThrow();
  });

  it("accepts the three spacing / radius presets", () => {
    expect(
      BrandingFormSchema.parse({ sectionPadding: "compact" }).sectionPadding,
    ).toBe("compact");
    expect(BrandingFormSchema.parse({ radius: "rounded" }).radius).toBe(
      "rounded",
    );
  });
});

describe("brandingFromJson / brandingToJson — C.5 round-trip", () => {
  it("reads the full design-token payload", () => {
    const stored = {
      name: "Acme",
      theme: "dark" as const,
      colors: {
        primary: "#111",
        secondary: "#333",
        accent: "#fa0",
        background: "#000",
        surface: "#141414",
        text: "#f5f5f5",
        muted: "#888",
        border: "#2a2a2a",
        ring: "#00e5a0",
      },
      typography: {
        heading: "Inter",
        body: "Inter",
        display: "Playfair Display",
        scaleRatio: 1.333,
        baseFontSize: 17,
      },
      spacing: { base: 4, sectionPadding: "spacious" as const },
      radius: "soft" as const,
    };
    const form = brandingFromJson(stored);
    expect(form.primaryColor).toBe("#111");
    expect(form.secondaryColor).toBe("#333");
    expect(form.surfaceColor).toBe("#141414");
    expect(form.headingFont).toBe("Inter");
    expect(form.displayFont).toBe("Playfair Display");
    expect(form.scaleRatio).toBe(1.333);
    expect(form.baseFontSize).toBe(17);
    expect(form.spacingBase).toBe(4);
    expect(form.sectionPadding).toBe("spacious");
    expect(form.radius).toBe("soft");
  });

  it("writes the full design-token payload", () => {
    const form = BrandingFormSchema.parse({
      primaryColor: "#111",
      secondaryColor: "#333",
      accentColor: "#fa0",
      surfaceColor: "#fafafa",
      textColor: "#000",
      headingFont: "Inter",
      displayFont: "Playfair Display",
      scaleRatio: 1.25,
      baseFontSize: 16,
      spacingBase: 4,
      sectionPadding: "balanced" as const,
      radius: "soft" as const,
      theme: "light" as const,
    });
    const out = brandingToJson(form);
    const colors = out.colors as Record<string, string>;
    const typography = out.typography as Record<string, unknown>;
    const spacing = out.spacing as Record<string, unknown>;
    expect(colors.primary).toBe("#111");
    expect(colors.secondary).toBe("#333");
    expect(colors.surface).toBe("#fafafa");
    expect(typography.heading).toBe("Inter");
    expect(typography.display).toBe("Playfair Display");
    expect(typography.scaleRatio).toBe(1.25);
    expect(typography.baseFontSize).toBe(16);
    expect(spacing.base).toBe(4);
    expect(spacing.sectionPadding).toBe("balanced");
    expect(out.radius).toBe("soft");
    expect(out.theme).toBe("light");
  });

  it("brandingToJson omits empty typography/spacing objects", () => {
    const out = brandingToJson({
      primaryColor: "",
      secondaryColor: "",
      accentColor: "",
      backgroundColor: "",
      surfaceColor: "",
      textColor: "",
      mutedColor: "",
      borderColor: "",
      ringColor: "",
      headingFont: "",
      bodyFont: "",
      displayFont: "",
      scaleRatio: undefined,
      baseFontSize: undefined,
      spacingBase: undefined,
      sectionPadding: undefined,
      radius: undefined,
      theme: "light",
    });
    expect(out.typography).toBeUndefined();
    expect(out.spacing).toBeUndefined();
    expect(out.colors).toBeUndefined();
    expect(out.radius).toBeUndefined();
  });
});
