/**
 * Query schema for the public (unauthenticated) pages endpoints.
 * Used only by /public/pages listing — :slug is a path param.
 */

import { z } from "zod";

export const ListPublicPagesQuerySchema = z.object({
  /** When true, limit to pages marked `showInNav` for header rendering. */
  nav: z.coerce.boolean().optional(),
});

export type ListPublicPagesQuery = z.infer<typeof ListPublicPagesQuerySchema>;
