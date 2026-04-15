/**
 * ThemeTokens — shared schema for the tenant-site design system.
 *
 * Phase 7 scope: types + Zod schema + a `defaultThemeTokens()` factory.
 * The tenant-site renderer maps these to CSS variables via an adapter
 * layer added in lib/theme-tokens.ts; the admin editor UI lands alongside
 * the Phase 4 block editor (deferred).
 *
 * The token set is intentionally small. Adding a token means adding a
 * default value here, a CSS variable name in the adapter, and updating
 * the editor's form. No magic "customize anything" scale — that path
 * leads to design-IDE feature creep.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FontDef {
  family: string;
  weights?: number[];
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  ring: string;
  /** Derived, editable: the on-primary label color for buttons. */
  onPrimary?: string;
}

export interface ThemeTokens {
  mode: "light" | "dark" | "auto";
  colors: ThemeColors;
  typography: {
    heading: FontDef;
    body: FontDef;
    display?: FontDef;
    /** Ratio used to derive h1..h6 sizes (e.g. 1.25 = major-third). */
    scaleRatio: number;
    /** Root font-size in px. */
    baseSize: number;
  };
  spacing: {
    unit: number; // px per base unit (4 = 4px rhythm)
    section: "compact" | "balanced" | "spacious";
    container: number; // max content width
  };
  shape: {
    radius: "sharp" | "soft" | "rounded" | number;
    buttonStyle: "solid" | "outline" | "pill";
  };
  motion: {
    enableAnimations: boolean;
    duration: number; // ms
  };
}

// ---------------------------------------------------------------------------
// Zod
// ---------------------------------------------------------------------------

const hex = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/, "Must be a hex color");

const FontDefSchema: z.ZodType<FontDef> = z
  .object({
    family: z.string().trim().min(1).max(200),
    weights: z.array(z.number().int().min(100).max(900)).max(9).optional(),
  })
  .strict();

export const ThemeColorsSchema: z.ZodType<ThemeColors> = z
  .object({
    primary: hex,
    secondary: hex,
    accent: hex,
    background: hex,
    surface: hex,
    text: hex,
    muted: hex,
    border: hex,
    ring: hex,
    onPrimary: hex.optional(),
  })
  .strict();

export const ThemeTokensSchema: z.ZodType<ThemeTokens> = z
  .object({
    mode: z.enum(["light", "dark", "auto"]),
    colors: ThemeColorsSchema,
    typography: z
      .object({
        heading: FontDefSchema,
        body: FontDefSchema,
        display: FontDefSchema.optional(),
        scaleRatio: z.number().min(1).max(2),
        baseSize: z.number().int().min(12).max(24),
      })
      .strict(),
    spacing: z
      .object({
        unit: z.number().int().min(2).max(16),
        section: z.enum(["compact", "balanced", "spacious"]),
        container: z.number().int().min(640).max(1600),
      })
      .strict(),
    shape: z
      .object({
        radius: z.union([
          z.enum(["sharp", "soft", "rounded"]),
          z.number().int().min(0).max(48),
        ]),
        buttonStyle: z.enum(["solid", "outline", "pill"]),
      })
      .strict(),
    motion: z
      .object({
        enableAnimations: z.boolean(),
        duration: z.number().int().min(0).max(1000),
      })
      .strict(),
  })
  .strict() as unknown as z.ZodType<ThemeTokens>;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export function defaultThemeTokens(): ThemeTokens {
  return {
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
}
