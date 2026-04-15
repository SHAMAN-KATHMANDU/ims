/**
 * Form validation + slug helpers for the custom-pages editor.
 *
 * The reserved-slug guard mirrors the backend (apps/api/src/modules/pages/
 * pages.schema.ts RESERVED_SLUGS) so the UI rejects bad slugs before the
 * server has to. Keep the two lists in sync.
 */

import { z } from "zod";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,80}$/;

export const RESERVED_SLUGS = new Set([
  "",
  "home",
  "index",
  "products",
  "contact",
  "blog",
  "api",
  "public",
  "static",
  "images",
  "admin",
  "_next",
  "healthz",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
]);

const optionalString = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const TenantPageFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(SLUG_REGEX, "Lowercase letters, digits, and dashes only")
    .max(80)
    .refine((s) => !RESERVED_SLUGS.has(s), {
      message: "This slug is reserved",
    }),
  title: z.string().trim().min(1, "Title is required").max(200),
  bodyMarkdown: z.string().trim().min(1, "Page body is required").max(200_000),
  layoutVariant: z
    .enum(["default", "full-width", "narrow"])
    .optional()
    .default("default"),
  showInNav: z.boolean().optional().default(true),
  navOrder: z.coerce.number().int().min(0).max(10_000).optional().default(0),
  seoTitle: optionalString(200),
  seoDescription: optionalString(500),
});

export type TenantPageFormInput = z.infer<typeof TenantPageFormSchema>;

/**
 * Convert a title into a URL-safe slug. Same rules as the blog editor.
 */
export function slugifyTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** SEO preview fallback chain: explicit field → title/description. */
export function pageSeoPreview(
  form: Pick<TenantPageFormInput, "title" | "seoTitle" | "seoDescription">,
): { title: string; description: string } {
  return {
    title: form.seoTitle || form.title || "",
    description: form.seoDescription || "",
  };
}
