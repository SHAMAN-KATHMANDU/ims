/**
 * Zod schemas for the tenant site editor forms.
 *
 * These are UI-level types that the editor works with. They serialize to the
 * free-form JSON payloads (`branding`, `contact`, `seo`) that the backend
 * stores on SiteConfig.
 *
 * Phase C.5 widened `BrandingFormSchema` to cover the full design-token
 * surface the renderer started consuming in C.2:
 *
 *   - 9 color tokens (primary / secondary / accent / background / surface /
 *     text / muted / border / ring)
 *   - Typography (heading, body, display, scale ratio, base font size)
 *   - Spacing (base unit + section-padding preset)
 *   - Shape (radius preset)
 *
 * Every field stays optional so older tenants with a partial payload keep
 * working — `brandingFromJson` fills missing fields with empty strings, and
 * `brandingToJson` only emits keys that are set.
 */

import { z } from "zod";

const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const optionalUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalHex = z
  .string()
  .trim()
  .regex(hex, "Use a hex color like #1E40AF")
  .optional()
  .or(z.literal(""));

const optionalFont = z.string().trim().max(120).optional().or(z.literal(""));

// ============================================
// Branding — full design-token surface
// ============================================

export const SECTION_PADDING_VALUES = [
  "compact",
  "balanced",
  "spacious",
] as const;
export const RADIUS_VALUES = ["sharp", "soft", "rounded"] as const;

export const BrandingFormSchema = z.object({
  // NOTE: Identity fields (name/displayName, tagline, logoUrl, faviconUrl,
  // contact email/phone/address, socials) have moved to TenantBusinessProfile.
  // Edit them in Settings → Business profile, not here.

  // Colors — 9 tokens
  primaryColor: optionalHex,
  secondaryColor: optionalHex,
  accentColor: optionalHex,
  backgroundColor: optionalHex,
  surfaceColor: optionalHex,
  textColor: optionalHex,
  mutedColor: optionalHex,
  borderColor: optionalHex,
  ringColor: optionalHex,

  // Typography
  headingFont: optionalFont,
  bodyFont: optionalFont,
  displayFont: optionalFont,
  scaleRatio: z.coerce
    .number()
    .min(1.05)
    .max(2)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  baseFontSize: z.coerce
    .number()
    .int()
    .min(12)
    .max(24)
    .optional()
    .or(z.literal("").transform(() => undefined)),

  // Spacing + shape
  spacingBase: z.coerce
    .number()
    .int()
    .min(2)
    .max(12)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  sectionPadding: z.enum(SECTION_PADDING_VALUES).optional(),
  radius: z.enum(RADIUS_VALUES).optional(),

  // Theme
  theme: z.enum(["light", "dark"]).optional(),
});

export type BrandingFormInput = z.infer<typeof BrandingFormSchema>;

// ============================================
// Contact
// ============================================

export const SOCIAL_KEYS = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "whatsapp",
  "x",
  "linkedin",
] as const;

export type SocialKey = (typeof SOCIAL_KEYS)[number];

export const ContactFormSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Must be a valid email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  mapUrl: optionalUrl,
  facebook: optionalUrl,
  instagram: optionalUrl,
  tiktok: optionalUrl,
  youtube: optionalUrl,
  whatsapp: optionalUrl,
  x: optionalUrl,
  linkedin: optionalUrl,
});

export type ContactFormInput = z.infer<typeof ContactFormSchema>;

// ============================================
// SEO
// ============================================

export const SeoFormSchema = z.object({
  title: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  keywords: z.string().trim().max(300).optional().or(z.literal("")),
  ogImage: optionalUrl,
});

export type SeoFormInput = z.infer<typeof SeoFormSchema>;

// ============================================
// Serialization helpers (form state <-> backend JSON)
// ============================================

type StoredBranding = {
  // name / tagline / logoUrl / faviconUrl have moved to TenantBusinessProfile
  theme?: "light" | "dark";
  colors?: {
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
  typography?: {
    heading?: string;
    body?: string;
    display?: string;
    scaleRatio?: number;
    baseFontSize?: number;
  };
  spacing?: {
    base?: number;
    sectionPadding?: (typeof SECTION_PADDING_VALUES)[number];
  };
  radius?: (typeof RADIUS_VALUES)[number];
};

export function brandingFromJson(
  json: Record<string, unknown> | null,
): BrandingFormInput {
  const j = (json ?? {}) as StoredBranding;
  const c = j.colors ?? {};
  const t = j.typography ?? {};
  const s = j.spacing ?? {};
  return {
    primaryColor: c.primary ?? "",
    secondaryColor: c.secondary ?? "",
    accentColor: c.accent ?? "",
    backgroundColor: c.background ?? "",
    surfaceColor: c.surface ?? "",
    textColor: c.text ?? "",
    mutedColor: c.muted ?? "",
    borderColor: c.border ?? "",
    ringColor: c.ring ?? "",

    headingFont: t.heading ?? "",
    bodyFont: t.body ?? "",
    displayFont: t.display ?? "",
    scaleRatio: t.scaleRatio,
    baseFontSize: t.baseFontSize,

    spacingBase: s.base,
    sectionPadding: s.sectionPadding,
    radius: j.radius,

    theme: j.theme ?? "light",
  };
}

function pick<T>(value: T | "" | undefined): T | undefined {
  return value === "" || value === undefined ? undefined : value;
}

export function brandingToJson(
  form: BrandingFormInput,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  // name / tagline / logoUrl / faviconUrl are stored in TenantBusinessProfile, not here
  if (form.theme) out.theme = form.theme;

  const colors: Record<string, string> = {};
  if (form.primaryColor) colors.primary = form.primaryColor;
  if (form.secondaryColor) colors.secondary = form.secondaryColor;
  if (form.accentColor) colors.accent = form.accentColor;
  if (form.backgroundColor) colors.background = form.backgroundColor;
  if (form.surfaceColor) colors.surface = form.surfaceColor;
  if (form.textColor) colors.text = form.textColor;
  if (form.mutedColor) colors.muted = form.mutedColor;
  if (form.borderColor) colors.border = form.borderColor;
  if (form.ringColor) colors.ring = form.ringColor;
  if (Object.keys(colors).length > 0) out.colors = colors;

  const typography: Record<string, string | number> = {};
  if (form.headingFont) typography.heading = form.headingFont;
  if (form.bodyFont) typography.body = form.bodyFont;
  if (form.displayFont) typography.display = form.displayFont;
  const scaleRatio = pick(form.scaleRatio);
  if (typeof scaleRatio === "number") typography.scaleRatio = scaleRatio;
  const baseFontSize = pick(form.baseFontSize);
  if (typeof baseFontSize === "number") typography.baseFontSize = baseFontSize;
  if (Object.keys(typography).length > 0) out.typography = typography;

  const spacing: Record<string, string | number> = {};
  const spacingBase = pick(form.spacingBase);
  if (typeof spacingBase === "number") spacing.base = spacingBase;
  if (form.sectionPadding) spacing.sectionPadding = form.sectionPadding;
  if (Object.keys(spacing).length > 0) out.spacing = spacing;

  if (form.radius) out.radius = form.radius;

  return out;
}

export function contactFromJson(
  json: Record<string, unknown> | null,
): ContactFormInput {
  const j = (json ?? {}) as {
    email?: string;
    phone?: string;
    address?: string;
    mapUrl?: string;
    socials?: Partial<Record<SocialKey, string>>;
  };
  const s = j.socials ?? {};
  return {
    email: j.email ?? "",
    phone: j.phone ?? "",
    address: j.address ?? "",
    mapUrl: j.mapUrl ?? "",
    facebook: s.facebook ?? "",
    instagram: s.instagram ?? "",
    tiktok: s.tiktok ?? "",
    youtube: s.youtube ?? "",
    whatsapp: s.whatsapp ?? "",
    x: s.x ?? "",
    linkedin: s.linkedin ?? "",
  };
}

export function contactToJson(form: ContactFormInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (form.email) out.email = form.email;
  if (form.phone) out.phone = form.phone;
  if (form.address) out.address = form.address;
  if (form.mapUrl) out.mapUrl = form.mapUrl;
  const socials: Record<string, string> = {};
  for (const key of SOCIAL_KEYS) {
    const v = form[key];
    if (v) socials[key] = v;
  }
  if (Object.keys(socials).length > 0) out.socials = socials;
  return out;
}

export function seoFromJson(
  json: Record<string, unknown> | null,
): SeoFormInput {
  const j = (json ?? {}) as {
    title?: string;
    description?: string;
    keywords?: string;
    ogImage?: string;
  };
  return {
    title: j.title ?? "",
    description: j.description ?? "",
    keywords: j.keywords ?? "",
    ogImage: j.ogImage ?? "",
  };
}

export function seoToJson(form: SeoFormInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (form.title) out.title = form.title;
  if (form.description) out.description = form.description;
  if (form.keywords) out.keywords = form.keywords;
  if (form.ogImage) out.ogImage = form.ogImage;
  return out;
}

// ============================================
// Analytics
// ============================================

export const AnalyticsFormSchema = z.object({
  ga4MeasurementId: z
    .string()
    .trim()
    .regex(/^G-[A-Z0-9]+$/, "Must be in G-XXXXXXXX format (e.g. G-XXXXXXXXXX)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  gtmContainerId: z
    .string()
    .trim()
    .regex(/^GTM-[A-Z0-9]+$/, "Must be in GTM-XXXXXX format (e.g. GTM-XXXXXX)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  metaPixelId: z
    .string()
    .trim()
    .regex(/^[0-9]{6,20}$/, "Must be a 6–20 digit numeric ID")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  consentMode: z.enum(["basic", "granted"]).optional().default("basic"),
});

export type AnalyticsFormInput = z.infer<typeof AnalyticsFormSchema>;

type StoredAnalytics = {
  ga4MeasurementId?: string;
  gtmContainerId?: string;
  metaPixelId?: string;
  consentMode?: "basic" | "granted";
};

export function analyticsFromJson(
  json: Record<string, unknown> | null,
): AnalyticsFormInput {
  const j = (json ?? {}) as StoredAnalytics;
  return {
    ga4MeasurementId: j.ga4MeasurementId ?? "",
    gtmContainerId: j.gtmContainerId ?? "",
    metaPixelId: j.metaPixelId ?? "",
    consentMode: j.consentMode ?? "basic",
  };
}

export function analyticsToJson(
  form: AnalyticsFormInput,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    consentMode: form.consentMode ?? "basic",
  };
  if (form.ga4MeasurementId) out.ga4MeasurementId = form.ga4MeasurementId;
  if (form.gtmContainerId) out.gtmContainerId = form.gtmContainerId;
  if (form.metaPixelId) out.metaPixelId = form.metaPixelId;
  return out;
}
