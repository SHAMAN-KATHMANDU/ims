/**
 * Form validation + slug helpers for the blog editor.
 */

import { z } from "zod";
import { BlockTreeSchema } from "@repo/shared";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,80}$/;

const optionalString = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const BlogPostFormSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .regex(SLUG_REGEX, "Lowercase letters, digits, and dashes only")
      .max(80),
    title: z.string().trim().min(1, "Title is required").max(200),
    excerpt: optionalString(500),
    /** Markdown body — required when body is empty/absent. */
    bodyMarkdown: z.string().trim().max(100_000).optional().default(""),
    /** Block tree — canonical body when present (Phase 2 onward). */
    body: BlockTreeSchema.default([]),
    /** ISO-8601 schedule timestamp; null clears the schedule. */
    scheduledPublishAt: z.string().datetime().nullable().optional(),
    heroImageUrl: z
      .string()
      .trim()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    /** Phase 8 — cover image (full-bleed above the title). */
    coverImageUrl: z
      .string()
      .trim()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    /** Phase 8 — emoji / short string rendered before the heading. */
    icon: z.string().trim().max(80).optional().or(z.literal("")),
    authorName: optionalString(120),
    categoryId: z
      .string()
      .uuid("Invalid category")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    seoTitle: optionalString(200),
    seoDescription: optionalString(500),
  })
  .refine(
    (v) =>
      (v.bodyMarkdown && v.bodyMarkdown.trim().length > 0) ||
      (v.body && v.body.length > 0),
    { message: "Post body is required", path: ["body"] },
  );

export type BlogPostFormInput = z.infer<typeof BlogPostFormSchema>;

export const BlogCategoryFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(SLUG_REGEX, "Lowercase letters, digits, and dashes only")
    .max(80),
  name: z.string().trim().min(1, "Name is required").max(120),
  description: optionalString(500),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
});

export type BlogCategoryFormInput = z.infer<typeof BlogCategoryFormSchema>;

/**
 * Convert a title into a URL-safe slug.
 *
 * - Lowercases
 * - Replaces runs of non-alphanumerics with a single dash
 * - Trims leading/trailing dashes
 * - Caps at 80 characters (matches DB-side validation)
 */
export function slugifyTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Parse a comma- or space-separated tag string into a cleaned tag array.
 * Deduplicates, lowercases, caps at 20.
 */
export function parseTagInput(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(/[,]+/)) {
    const t = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t) continue;
    if (t.length > 40) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 20) break;
  }
  return out;
}

/**
 * Fallback chain for SEO title: explicit seoTitle → title.
 * Fallback chain for SEO description: explicit seoDescription → excerpt.
 * Returns the value that would end up in the rendered <meta> tag.
 */
export function seoPreview(
  form: Pick<
    BlogPostFormInput,
    "title" | "excerpt" | "seoTitle" | "seoDescription"
  >,
): { title: string; description: string } {
  return {
    title: form.seoTitle || form.title || "",
    description: form.seoDescription || form.excerpt || "",
  };
}
