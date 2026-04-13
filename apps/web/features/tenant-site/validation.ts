/**
 * Zod schemas for the tenant site editor forms.
 *
 * These are UI-level types that the editor works with. They get serialized
 * to the free-form JSON payloads (`branding`, `contact`, `seo`) that the
 * backend stores on SiteConfig.
 */

import { z } from "zod";

const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const optionalUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const BrandingFormSchema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal("")),
  tagline: z.string().trim().max(200).optional().or(z.literal("")),
  logoUrl: optionalUrl,
  faviconUrl: optionalUrl,
  primaryColor: z
    .string()
    .trim()
    .regex(hex, "Use a hex color like #1E40AF")
    .optional()
    .or(z.literal("")),
  accentColor: z
    .string()
    .trim()
    .regex(hex, "Use a hex color like #F59E0B")
    .optional()
    .or(z.literal("")),
  theme: z.enum(["light", "dark"]).optional(),
});

export type BrandingFormInput = z.infer<typeof BrandingFormSchema>;

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
});

export type ContactFormInput = z.infer<typeof ContactFormSchema>;

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

export function brandingFromJson(
  json: Record<string, unknown> | null,
): BrandingFormInput {
  const j = (json ?? {}) as {
    name?: string;
    tagline?: string;
    logoUrl?: string;
    faviconUrl?: string;
    theme?: "light" | "dark";
    colors?: { primary?: string; accent?: string };
  };
  return {
    name: j.name ?? "",
    tagline: j.tagline ?? "",
    logoUrl: j.logoUrl ?? "",
    faviconUrl: j.faviconUrl ?? "",
    primaryColor: j.colors?.primary ?? "",
    accentColor: j.colors?.accent ?? "",
    theme: j.theme ?? "light",
  };
}

export function brandingToJson(
  form: BrandingFormInput,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (form.name) out.name = form.name;
  if (form.tagline) out.tagline = form.tagline;
  if (form.logoUrl) out.logoUrl = form.logoUrl;
  if (form.faviconUrl) out.faviconUrl = form.faviconUrl;
  if (form.theme) out.theme = form.theme;
  if (form.primaryColor || form.accentColor) {
    out.colors = {
      ...(form.primaryColor ? { primary: form.primaryColor } : {}),
      ...(form.accentColor ? { accent: form.accentColor } : {}),
    };
  }
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
  };
  return {
    email: j.email ?? "",
    phone: j.phone ?? "",
    address: j.address ?? "",
    mapUrl: j.mapUrl ?? "",
  };
}

export function contactToJson(form: ContactFormInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (form.email) out.email = form.email;
  if (form.phone) out.phone = form.phone;
  if (form.address) out.address = form.address;
  if (form.mapUrl) out.mapUrl = form.mapUrl;
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
