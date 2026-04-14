/**
 * Tenant-scoped blog schemas.
 *
 * Posts are markdown-bodied; the tenant-site renderer handles sanitization
 * at render time (rehype-sanitize) — but the editor never stores raw HTML,
 * only markdown, so the attack surface stays small.
 */

import { z } from "zod";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,80}$/;
const slug = z
  .string()
  .trim()
  .regex(SLUG_REGEX, "Slug must be lowercase letters, digits, or dashes");

const optionalString = (max: number) =>
  z.string().trim().max(max).optional().nullable();

const tagString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9- ]*$/i, "Invalid tag");

export const CreateBlogPostSchema = z.object({
  slug,
  title: z.string().trim().min(1).max(200),
  excerpt: optionalString(500),
  bodyMarkdown: z.string().min(1).max(100_000),
  heroImageUrl: optionalString(1000),
  authorName: optionalString(120),
  categoryId: z.string().uuid().optional().nullable(),
  tags: z.array(tagString).max(20).optional().default([]),
  seoTitle: optionalString(200),
  seoDescription: optionalString(500),
});

export const UpdateBlogPostSchema = CreateBlogPostSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "At least one field must be provided" },
);

export const ListBlogPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().trim().min(1).optional(),
});

export const CreateBlogCategorySchema = z.object({
  slug,
  name: z.string().trim().min(1).max(120),
  description: optionalString(500),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export const UpdateBlogCategorySchema =
  CreateBlogCategorySchema.partial().refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });

export type CreateBlogPostInput = z.infer<typeof CreateBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof UpdateBlogPostSchema>;
export type ListBlogPostsQuery = z.infer<typeof ListBlogPostsQuerySchema>;
export type CreateBlogCategoryInput = z.infer<typeof CreateBlogCategorySchema>;
export type UpdateBlogCategoryInput = z.infer<typeof UpdateBlogCategorySchema>;

/**
 * Estimate reading time from a markdown body.
 *
 * Uses the 200-wpm heuristic with a 1-minute floor. Strips fenced code
 * blocks and inline code so a post heavy in code samples doesn't read as
 * "30 minutes" when the prose is a paragraph long. Good enough — the
 * editor shows the value as a soft hint, not a contract.
 */
export function computeReadingMinutes(markdown: string): number {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ");
  const words = stripped.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
