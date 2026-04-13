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
  it("accepts a full valid payload", () => {
    const result = BrandingFormSchema.parse({
      name: "Acme",
      tagline: "Handcrafted",
      logoUrl: "https://example.com/logo.png",
      faviconUrl: "https://example.com/fav.ico",
      primaryColor: "#1E40AF",
      accentColor: "#F59E0B",
      theme: "light",
    });
    expect(result.primaryColor).toBe("#1E40AF");
  });

  it("accepts empty strings for all optional fields", () => {
    expect(() =>
      BrandingFormSchema.parse({
        name: "",
        tagline: "",
        logoUrl: "",
        faviconUrl: "",
        primaryColor: "",
        accentColor: "",
      }),
    ).not.toThrow();
  });

  it("rejects non-hex primaryColor", () => {
    expect(() => BrandingFormSchema.parse({ primaryColor: "blue" })).toThrow();
  });

  it("rejects invalid logo URL", () => {
    expect(() => BrandingFormSchema.parse({ logoUrl: "not a url" })).toThrow();
  });
});

describe("branding serialization round-trip", () => {
  it("brandingFromJson handles null/missing fields", () => {
    const result = brandingFromJson(null);
    expect(result.name).toBe("");
    expect(result.theme).toBe("light");
  });

  it("brandingFromJson reads colors.primary/accent", () => {
    const result = brandingFromJson({
      name: "Acme",
      colors: { primary: "#111", accent: "#222" },
      theme: "dark",
    });
    expect(result.primaryColor).toBe("#111");
    expect(result.accentColor).toBe("#222");
    expect(result.theme).toBe("dark");
  });

  it("brandingToJson strips empty strings and nests colors", () => {
    const result = brandingToJson({
      name: "Acme",
      tagline: "",
      logoUrl: "",
      faviconUrl: "",
      primaryColor: "#111",
      accentColor: "#222",
      theme: "dark",
    });
    expect(result).toEqual({
      name: "Acme",
      theme: "dark",
      colors: { primary: "#111", accent: "#222" },
    });
  });

  it("brandingToJson omits colors entirely when neither is set", () => {
    const result = brandingToJson({
      name: "Acme",
      tagline: "",
      logoUrl: "",
      faviconUrl: "",
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
