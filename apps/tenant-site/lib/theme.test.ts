import { describe, it, expect } from "vitest";
import {
  brandingToCssVars,
  brandingDisplayName,
  brandingTagline,
  brandingLogoUrl,
  brandingTheme,
} from "./theme";

describe("brandingToCssVars", () => {
  it("emits no vars for null input", () => {
    expect(brandingToCssVars(null)).toEqual({});
  });

  it("emits no vars for empty object", () => {
    expect(brandingToCssVars({})).toEqual({});
  });

  it("emits all 9 color tokens when provided", () => {
    const vars = brandingToCssVars({
      colors: {
        primary: "#111",
        secondary: "#333",
        accent: "#fa0",
        background: "#fff",
        surface: "#f5f5f5",
        text: "#000",
        muted: "#888",
        border: "#ddd",
        ring: "#111",
      },
    });
    expect(vars["--color-primary"]).toBe("#111");
    expect(vars["--color-secondary"]).toBe("#333");
    expect(vars["--color-accent"]).toBe("#fa0");
    expect(vars["--color-background"]).toBe("#fff");
    expect(vars["--color-surface"]).toBe("#f5f5f5");
    expect(vars["--color-text"]).toBe("#000");
    expect(vars["--color-muted"]).toBe("#888");
    expect(vars["--color-border"]).toBe("#ddd");
    expect(vars["--color-ring"]).toBe("#111");
  });

  it("preserves Phase-A back-compat aliases for primary/accent/bg/text", () => {
    const vars = brandingToCssVars({
      colors: {
        primary: "#111",
        accent: "#fa0",
        background: "#fff",
        text: "#000",
      },
    });
    expect(vars["--primary"]).toBe("#111");
    expect(vars["--accent"]).toBe("#fa0");
    expect(vars["--bg"]).toBe("#fff");
    expect(vars["--text"]).toBe("#000");
  });

  it("only emits tokens that are present (partial configuration)", () => {
    const vars = brandingToCssVars({
      colors: { primary: "#111" },
    });
    expect(vars["--color-primary"]).toBe("#111");
    expect(vars["--color-secondary"]).toBeUndefined();
    expect(vars["--color-background"]).toBeUndefined();
  });

  it("wraps multi-word font family names in quotes with sensible fallbacks", () => {
    const vars = brandingToCssVars({
      typography: { heading: "Cormorant Garamond", body: "Source Sans 3" },
    });
    expect(vars["--font-heading"]).toContain('"Cormorant Garamond"');
    expect(vars["--font-heading"]).toContain("system-ui");
    expect(vars["--font-body"]).toContain('"Source Sans 3"');
  });

  it("passes single-word font names through with a fallback stack", () => {
    const vars = brandingToCssVars({
      typography: { heading: "Inter", body: "Inter" },
    });
    expect(vars["--font-heading"]).toBe("Inter, system-ui, sans-serif");
    expect(vars["--font-body"]).toBe("Inter, system-ui, sans-serif");
  });

  it("accepts an explicit comma-separated font family verbatim", () => {
    const vars = brandingToCssVars({
      typography: { heading: "Inter, Helvetica, sans-serif" },
    });
    expect(vars["--font-heading"]).toBe("Inter, Helvetica, sans-serif");
  });

  it("falls back to heading family for --font-display when display not set", () => {
    const vars = brandingToCssVars({
      typography: { heading: "Playfair Display" },
    });
    expect(vars["--font-display"]).toContain('"Playfair Display"');
  });

  it("uses an explicit display family when provided", () => {
    const vars = brandingToCssVars({
      typography: {
        heading: "Inter",
        display: "Fraunces",
      },
    });
    expect(vars["--font-display"]).toContain("Fraunces");
  });

  it("emits --type-scale and --type-base when provided", () => {
    const vars = brandingToCssVars({
      typography: { scaleRatio: 1.333, baseFontSize: 17 },
    });
    expect(vars["--type-scale"]).toBe("1.333");
    expect(vars["--type-base"]).toBe("17px");
  });

  it("rejects invalid scaleRatio / baseFontSize", () => {
    const vars = brandingToCssVars({
      typography: { scaleRatio: 0.9, baseFontSize: 8 },
    });
    expect(vars["--type-scale"]).toBeUndefined();
    expect(vars["--type-base"]).toBeUndefined();
  });

  it("emits spacing tokens when provided", () => {
    const vars = brandingToCssVars({
      spacing: { base: 5, sectionPadding: "spacious" },
    });
    expect(vars["--space-unit"]).toBe("5px");
    expect(vars["--section-padding"]).toBe("6rem");
  });

  it("maps all three section-padding presets", () => {
    expect(
      brandingToCssVars({ spacing: { sectionPadding: "compact" } })[
        "--section-padding"
      ],
    ).toBe("2.5rem");
    expect(
      brandingToCssVars({ spacing: { sectionPadding: "balanced" } })[
        "--section-padding"
      ],
    ).toBe("4rem");
    expect(
      brandingToCssVars({ spacing: { sectionPadding: "spacious" } })[
        "--section-padding"
      ],
    ).toBe("6rem");
  });

  it("maps all three radius presets", () => {
    expect(brandingToCssVars({ radius: "sharp" })["--radius"]).toBe("0");
    expect(brandingToCssVars({ radius: "soft" })["--radius"]).toBe("6px");
    expect(brandingToCssVars({ radius: "rounded" })["--radius"]).toBe("14px");
  });

  it("ignores unknown radius value", () => {
    const vars = brandingToCssVars({
      radius: "weird" as unknown as "sharp",
    });
    expect(vars["--radius"]).toBeUndefined();
  });
});

describe("brandingDisplayName", () => {
  it("returns trimmed name when set", () => {
    expect(brandingDisplayName({ name: "  Acme  " }, "fallback")).toBe("Acme");
  });

  it("falls back when missing or blank", () => {
    expect(brandingDisplayName(null, "fallback")).toBe("fallback");
    expect(brandingDisplayName({ name: "  " }, "fallback")).toBe("fallback");
  });
});

describe("brandingTagline", () => {
  it("returns tagline when set", () => {
    expect(brandingTagline({ tagline: "Hand-crafted since 1998" })).toBe(
      "Hand-crafted since 1998",
    );
  });

  it("returns null when missing or blank", () => {
    expect(brandingTagline(null)).toBeNull();
    expect(brandingTagline({ tagline: "" })).toBeNull();
  });
});

describe("brandingLogoUrl", () => {
  it("returns logoUrl when set", () => {
    expect(
      brandingLogoUrl({ logoUrl: "https://cdn.example.com/logo.png" }),
    ).toBe("https://cdn.example.com/logo.png");
  });

  it("returns null when missing", () => {
    expect(brandingLogoUrl(null)).toBeNull();
  });
});

describe("brandingTheme", () => {
  it("returns 'dark' only when explicitly set", () => {
    expect(brandingTheme({ theme: "dark" })).toBe("dark");
  });

  it("returns 'light' by default", () => {
    expect(brandingTheme(null)).toBe("light");
    expect(brandingTheme({})).toBe("light");
    expect(brandingTheme({ theme: "light" })).toBe("light");
    expect(brandingTheme({ theme: "bogus" })).toBe("light");
  });
});
