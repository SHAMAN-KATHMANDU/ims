import { describe, it, expect } from "vitest";
import { themeTokensToCssVars } from "./theme-tokens";
import type { ThemeTokens } from "@repo/shared";

// ── fixture ────────────────────────────────────────────────────────────────

const defaultTokens: ThemeTokens = {
  mode: "light",
  colors: {
    primary: "#111111",
    secondary: "#444444",
    accent: "#f5f5f5",
    background: "#ffffff",
    surface: "#fafafa",
    text: "#111111",
    muted: "#6b7280",
    border: "#e5e5e5",
    ring: "#111111",
    onPrimary: "#ffffff",
  },
  typography: {
    heading: { family: "system-ui, sans-serif" },
    body: { family: "system-ui, sans-serif" },
    scaleRatio: 1.25,
    baseSize: 16,
  },
  spacing: { unit: 4, section: "balanced", container: 1200 },
  shape: { radius: "soft", buttonStyle: "solid" },
  motion: { enableAnimations: true, duration: 200 },
};

// ── numeric radius ─────────────────────────────────────────────────────────

describe("themeTokensToCssVars — numeric radius", () => {
  it("converts numeric radius to px string", () => {
    const tokens: ThemeTokens = {
      ...defaultTokens,
      shape: { ...defaultTokens.shape, radius: 8 },
    };
    const vars = themeTokensToCssVars(tokens);
    expect(vars["--radius"]).toBe("8px");
  });

  it("converts zero radius to px string", () => {
    const tokens: ThemeTokens = {
      ...defaultTokens,
      shape: { ...defaultTokens.shape, radius: 0 },
    };
    const vars = themeTokensToCssVars(tokens);
    expect(vars["--radius"]).toBe("0px");
  });
});

// ── keyword radius ─────────────────────────────────────────────────────────

describe("themeTokensToCssVars — keyword radius", () => {
  it("maps 'sharp' to 0", () => {
    const tokens: ThemeTokens = {
      ...defaultTokens,
      shape: { ...defaultTokens.shape, radius: "sharp" },
    };
    const vars = themeTokensToCssVars(tokens);
    expect(vars["--radius"]).toBe("0");
  });

  it("maps 'soft' to 6px", () => {
    const tokens: ThemeTokens = {
      ...defaultTokens,
      shape: { ...defaultTokens.shape, radius: "soft" },
    };
    const vars = themeTokensToCssVars(tokens);
    expect(vars["--radius"]).toBe("6px");
  });

  it("maps 'rounded' to 12px", () => {
    const tokens: ThemeTokens = {
      ...defaultTokens,
      shape: { ...defaultTokens.shape, radius: "rounded" },
    };
    const vars = themeTokensToCssVars(tokens);
    expect(vars["--radius"]).toBe("12px");
  });
});

// ── unknown keyword radius fallback ────────────────────────────────────────

describe("themeTokensToCssVars — unknown keyword radius", () => {
  it("falls back to 'soft' for unknown keyword (cast as any)", () => {
    const tokens = {
      ...defaultTokens,
      shape: { ...defaultTokens.shape, radius: "unknown" as any },
    };
    const vars = themeTokensToCssVars(tokens);
    // Should not be "undefined" string, should be the soft value
    expect(vars["--radius"]).toBe("6px");
  });

  it("does not emit 'undefined' string for unknown keyword", () => {
    const tokens = {
      ...defaultTokens,
      shape: { ...defaultTokens.shape, radius: "bogus" as any },
    };
    const vars = themeTokensToCssVars(tokens);
    expect(vars["--radius"]).not.toBe("undefined");
  });
});

// ── color vars ─────────────────────────────────────────────────────────────

describe("themeTokensToCssVars — color variables", () => {
  it("includes --color-primary", () => {
    const vars = themeTokensToCssVars(defaultTokens);
    expect(vars["--color-primary"]).toBe("#111111");
  });

  it("includes --color-secondary", () => {
    const vars = themeTokensToCssVars(defaultTokens);
    expect(vars["--color-secondary"]).toBe("#444444");
  });

  it("includes legacy --primary alias", () => {
    const vars = themeTokensToCssVars(defaultTokens);
    expect(vars["--primary"]).toBe("#111111");
  });

  it("includes legacy --accent alias", () => {
    const vars = themeTokensToCssVars(defaultTokens);
    expect(vars["--accent"]).toBe("#f5f5f5");
  });
});

// ── section padding ────────────────────────────────────────────────────────

describe("themeTokensToCssVars — section padding", () => {
  it("maps 'compact' to 3rem", () => {
    const tokens: ThemeTokens = {
      ...defaultTokens,
      spacing: { ...defaultTokens.spacing, section: "compact" },
    };
    const vars = themeTokensToCssVars(tokens);
    expect(vars["--section-padding"]).toBe("3rem");
  });

  it("maps 'balanced' to 4rem", () => {
    const tokens: ThemeTokens = {
      ...defaultTokens,
      spacing: { ...defaultTokens.spacing, section: "balanced" },
    };
    const vars = themeTokensToCssVars(tokens);
    expect(vars["--section-padding"]).toBe("4rem");
  });

  it("maps 'spacious' to 6rem", () => {
    const tokens: ThemeTokens = {
      ...defaultTokens,
      spacing: { ...defaultTokens.spacing, section: "spacious" },
    };
    const vars = themeTokensToCssVars(tokens);
    expect(vars["--section-padding"]).toBe("6rem");
  });
});
