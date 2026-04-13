/**
 * Convert a tenant's SiteConfig.branding payload into inline CSS custom
 * properties that template components can consume via `var(--primary)` etc.
 *
 * Input shape (free-form, strip defensively):
 *   {
 *     name?, tagline?, logoUrl?, faviconUrl?, theme?: "light" | "dark",
 *     colors?: { primary?, accent?, background?, text? },
 *     typography?: { heading?, body? },
 *   }
 */

export interface BrandingVars {
  "--primary"?: string;
  "--accent"?: string;
  "--bg"?: string;
  "--text"?: string;
  "--font-heading"?: string;
  "--font-body"?: string;
}

interface BrandingInput {
  theme?: "light" | "dark";
  colors?: {
    primary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
  typography?: {
    heading?: string;
    body?: string;
  };
}

export function brandingToCssVars(
  branding: Record<string, unknown> | null,
): BrandingVars {
  const b = (branding ?? {}) as BrandingInput;
  const vars: BrandingVars = {};

  if (b.colors?.primary) vars["--primary"] = b.colors.primary;
  if (b.colors?.accent) vars["--accent"] = b.colors.accent;
  if (b.colors?.background) vars["--bg"] = b.colors.background;
  if (b.colors?.text) vars["--text"] = b.colors.text;
  if (b.typography?.heading) vars["--font-heading"] = b.typography.heading;
  if (b.typography?.body) vars["--font-body"] = b.typography.body;

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
