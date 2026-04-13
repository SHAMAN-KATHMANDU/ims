/**
 * Public site endpoint schemas (query params only — no POST bodies).
 */

import { z } from "zod";

export const ListProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  categoryId: z.string().uuid().optional(),
  search: z.string().trim().min(1).optional(),
});

export type ListProductsQuery = z.infer<typeof ListProductsQuerySchema>;
