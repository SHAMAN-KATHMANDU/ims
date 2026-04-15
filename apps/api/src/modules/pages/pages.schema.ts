/**
 * Tenant-scoped custom-page schemas.
 *
 * Pages are markdown-bodied (same stack as blog posts). The slug namespace
 * is flat per tenant — a page at slug "about" is served as
 * https://<tenant-host>/about. The editor blocks reserved slugs to avoid
 * colliding with built-in routes.
 */

import { z } from "zod";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,80}$/;

/**
 * Reserved slugs the tenant editor must refuse. These are either routes the
 * tenant-site already owns (home, products, contact, blog) or app/asset
 * directories (api, _next, static, images) that would collide with Next's
 * own URL space.
 */
const RESERVED_SLUGS = new Set([
  "",
  "home",
  "index",
  "products",
  "contact",
  "blog",
  "cart",
  "checkout",
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

export const LAYOUT_VARIANTS = ["default", "full-width", "narrow"] as const;

const slugField = z
  .string()
  .trim()
  .regex(SLUG_REGEX, "Lowercase letters, digits, and dashes only")
  .refine((s) => !RESERVED_SLUGS.has(s), {
    message: "This slug is reserved for a built-in page",
  });

const optionalString = (max: number) =>
  z.string().trim().max(max).optional().nullable();

export const CreateTenantPageSchema = z.object({
  slug: slugField,
  title: z.string().trim().min(1).max(200),
  bodyMarkdown: z.string().min(1).max(200_000),
  layoutVariant: z.enum(LAYOUT_VARIANTS).optional().default("default"),
  showInNav: z.boolean().optional().default(true),
  navOrder: z.number().int().min(0).max(10_000).optional().default(0),
  seoTitle: optionalString(200),
  seoDescription: optionalString(500),
});

export const UpdateTenantPageSchema = CreateTenantPageSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "At least one field must be provided" },
);

export const ReorderPagesSchema = z.object({
  order: z.array(
    z.object({
      id: z.string().uuid(),
      navOrder: z.number().int().min(0).max(10_000),
    }),
  ),
});

export const ListTenantPagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  published: z.coerce.boolean().optional(),
});

export type CreateTenantPageInput = z.infer<typeof CreateTenantPageSchema>;
export type UpdateTenantPageInput = z.infer<typeof UpdateTenantPageSchema>;
export type ReorderPagesInput = z.infer<typeof ReorderPagesSchema>;
export type ListTenantPagesQuery = z.infer<typeof ListTenantPagesQuerySchema>;

export { RESERVED_SLUGS };
