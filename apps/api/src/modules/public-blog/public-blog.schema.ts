/**
 * Public blog endpoint schemas — query params for list + filter endpoints.
 * No POST bodies on public-blog.
 */

import { z } from "zod";

export const ListPublicPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  categorySlug: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
});

export const FeaturedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).default(3),
});

export type ListPublicPostsQuery = z.infer<typeof ListPublicPostsQuerySchema>;
export type FeaturedQuery = z.infer<typeof FeaturedQuerySchema>;
