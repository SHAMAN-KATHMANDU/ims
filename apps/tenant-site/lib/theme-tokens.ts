/**
 * Adapter from ThemeTokens (shared schema) to the CSS variables the
 * tenant-site renderer consumes. The existing lib/theme.ts stays as the
 * source of truth for the legacy `branding` JSON; when a tenant has a
 * `themeTokens` payload on SiteConfig (set via the Phase 4 editor), we
 * prefer that and emit a superset of the legacy vars so both rendering
 * paths stay compatible.
 *
 * This file is pure data — it does not touch React. The root layout
 * spreads the result onto `<html>` in a `style={{ ... }}` attribute.
 */

import type { ThemeTokens } from "@repo/shared";

const RADIUS_MAP: Record<"sharp" | "soft" | "rounded", string> = {
  sharp: "0",
  soft: "6px",
  rounded: "12px",
};

const SECTION_PADDING_MAP: Record<ThemeTokens["spacing"]["section"], string> = {
  compact: "3rem",
  balanced: "4rem",
  spacious: "6rem",
};

/**
 * Convert a ThemeTokens payload into a CSS-custom-property record suitable
 * for spreading onto an element's `style` prop. Legacy `--primary` / `--bg`
 * / `--text` aliases are emitted alongside the `--color-*` names so older
 * templates keep working during Phase 8's migration window.
 */
export function themeTokensToCssVars(
  tokens: ThemeTokens,
): Record<string, string> {
  const radius =
    typeof tokens.shape.radius === "number"
      ? `${tokens.shape.radius}px`
      : RADIUS_MAP[tokens.shape.radius];

  return {
    // Colors
    "--color-primary": tokens.colors.primary,
    "--color-secondary": tokens.colors.secondary,
    "--color-accent": tokens.colors.accent,
    "--color-background": tokens.colors.background,
    "--color-surface": tokens.colors.surface,
    "--color-text": tokens.colors.text,
    "--color-muted": tokens.colors.muted,
    "--color-border": tokens.colors.border,
    "--color-ring": tokens.colors.ring,
    "--color-on-primary": tokens.colors.onPrimary ?? "#ffffff",
    // Legacy aliases
    "--primary": tokens.colors.primary,
    "--accent": tokens.colors.accent,
    "--bg": tokens.colors.background,
    "--text": tokens.colors.text,
    // Typography
    "--font-heading": tokens.typography.heading.family,
    "--font-body": tokens.typography.body.family,
    "--font-display":
      tokens.typography.display?.family ?? tokens.typography.heading.family,
    "--type-scale": String(tokens.typography.scaleRatio),
    "--type-base": `${tokens.typography.baseSize}px`,
    // Spacing
    "--space-unit": `${tokens.spacing.unit}px`,
    "--section-padding": SECTION_PADDING_MAP[tokens.spacing.section],
    "--container-width": `${tokens.spacing.container}px`,
    // Shape
    "--radius": radius,
    // Motion
    "--motion-duration": `${tokens.motion.duration}ms`,
  };
}
