/**
 * Convert a tenant's SiteConfig.branding payload into inline CSS custom
 * properties that template components consume via `var(--color-primary)` etc.
 *
 * The full design-token set (Phase C.2):
 *
 *   colors (9 tokens):
 *     --color-primary       brand accent, CTA background
 *     --color-secondary     muted primary, hover states
 *     --color-accent        secondary CTA, badges
 *     --color-background    page background
 *     --color-surface       card / panel background
 *     --color-text          body text color
 *     --color-muted         secondary text, captions
 *     --color-border        hairlines, dividers
 *     --color-ring          focus ring color
 *
 *   typography:
 *     --font-heading        headings (h1–h6)
 *     --font-body           body text
 *     --font-display        oversized hero / display type (falls back to heading)
 *     --type-scale          modular scale ratio (default 1.25)
 *     --type-base           base font size in px (default 16)
 *
 *   spacing:
 *     --space-unit          base spacing unit in px (default 4)
 *     --section-padding     section vertical padding preset (compact/balanced/spacious)
 *
 *   shape:
 *     --radius              corner radius preset (sharp/soft/rounded)
 *
 * Branding input shape is intentionally permissive — anything not set in
 * SiteConfig.branding just falls through to the `:root` defaults in
 * globals.css, so a half-configured tenant still renders cleanly.
 */

export type BrandingVars = Record<string, string>;

type ColorTokens = {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  surface?: string;
  text?: string;
  muted?: string;
  border?: string;
  ring?: string;
};

type TypographyTokens = {
  heading?: string;
  body?: string;
  display?: string;
  /** Modular scale ratio: 1.125 | 1.2 | 1.25 | 1.333 | 1.414 | 1.5 */
  scaleRatio?: number;
  /** Base font size in pixels; 14–20 is typical. */
  baseFontSize?: number;
};

type SpacingTokens = {
  /** Base spacing unit in px — all utility paddings are multiples of this. */
  base?: number;
  /** Section vertical padding preset. */
  sectionPadding?: "compact" | "balanced" | "spacious";
};

type RadiusPreset = "sharp" | "soft" | "rounded";

interface BrandingInput {
  theme?: "light" | "dark";
  colors?: ColorTokens;
  typography?: TypographyTokens;
  spacing?: SpacingTokens;
  radius?: RadiusPreset;
}

const SECTION_PADDING_MAP: Record<
  NonNullable<SpacingTokens["sectionPadding"]>,
  string
> = {
  compact: "2.5rem",
  balanced: "4rem",
  spacious: "6rem",
};

const RADIUS_MAP: Record<RadiusPreset, string> = {
  sharp: "0",
  soft: "6px",
  rounded: "14px",
};

function wrapFontFamily(name: string): string {
  // Quote multi-word font names; bare tokens like "Inter" pass through.
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes(",")) return trimmed;
  if (/\s/.test(trimmed)) return `"${trimmed}", system-ui, sans-serif`;
  return `${trimmed}, system-ui, sans-serif`;
}

/**
 * Emit CSS custom properties for every token present in the tenant's
 * branding JSON. Missing tokens are simply not emitted — `globals.css`
 * provides safe defaults for every variable so partial configurations
 * render without visual regressions.
 */
export function brandingToCssVars(
  branding: Record<string, unknown> | null,
): BrandingVars {
  const b = (branding ?? {}) as BrandingInput;
  const vars: BrandingVars = {};

  // ---- Colors ----
  const c = b.colors ?? {};
  if (c.primary) {
    vars["--color-primary"] = c.primary;
    // Back-compat with Phase-A templates that still read `--primary`.
    vars["--primary"] = c.primary;
  }
  if (c.secondary) vars["--color-secondary"] = c.secondary;
  if (c.accent) {
    vars["--color-accent"] = c.accent;
    vars["--accent"] = c.accent;
  }
  if (c.background) {
    vars["--color-background"] = c.background;
    vars["--bg"] = c.background;
  }
  if (c.surface) vars["--color-surface"] = c.surface;
  if (c.text) {
    vars["--color-text"] = c.text;
    vars["--text"] = c.text;
  }
  if (c.muted) vars["--color-muted"] = c.muted;
  if (c.border) vars["--color-border"] = c.border;
  if (c.ring) vars["--color-ring"] = c.ring;

  // ---- Typography ----
  const t = b.typography ?? {};
  if (t.heading) vars["--font-heading"] = wrapFontFamily(t.heading);
  if (t.body) vars["--font-body"] = wrapFontFamily(t.body);
  if (t.display) {
    vars["--font-display"] = wrapFontFamily(t.display);
  } else if (t.heading) {
    // Display falls back to heading family when not set.
    vars["--font-display"] = wrapFontFamily(t.heading);
  }
  if (typeof t.scaleRatio === "number" && t.scaleRatio > 1) {
    vars["--type-scale"] = String(t.scaleRatio);
  }
  if (typeof t.baseFontSize === "number" && t.baseFontSize >= 12) {
    vars["--type-base"] = `${t.baseFontSize}px`;
  }

  // ---- Spacing ----
  const s = b.spacing ?? {};
  if (typeof s.base === "number" && s.base > 0) {
    vars["--space-unit"] = `${s.base}px`;
  }
  if (s.sectionPadding && SECTION_PADDING_MAP[s.sectionPadding]) {
    vars["--section-padding"] = SECTION_PADDING_MAP[s.sectionPadding];
  }

  // ---- Radius ----
  if (b.radius && RADIUS_MAP[b.radius]) {
    vars["--radius"] = RADIUS_MAP[b.radius];
  }

  return vars;
}

export function brandingDisplayName(
  branding: Record<string, unknown> | null,
  fallback: string,
): string {
  const b = (branding ?? {}) as { name?: string };
  return b.name?.trim() || fallback;
}

export function brandingTagline(
  branding: Record<string, unknown> | null,
): string | null {
  const b = (branding ?? {}) as { tagline?: string };
  return b.tagline?.trim() || null;
}

export function brandingLogoUrl(
  branding: Record<string, unknown> | null,
): string | null {
  const b = (branding ?? {}) as { logoUrl?: string };
  return b.logoUrl?.trim() || null;
}

/**
 * Resolve the effective theme (light | dark) from a branding payload.
 * Defaults to light when unset.
 */
export function brandingTheme(
  branding: Record<string, unknown> | null,
): "light" | "dark" {
  const b = (branding ?? {}) as { theme?: string };
  return b.theme === "dark" ? "dark" : "light";
}
