import { z } from "zod";

const optStr = (max: number) => z.string().trim().max(max).optional();

/**
 * Blog list props — featured blog posts.
 */
export interface BlogListProps {
  heading?: string;
  limit: number;
  columns: 2 | 3 | 4;
  cardVariant?: "default" | "minimal" | "card";
  showExcerpt?: boolean;
  showDate?: boolean;
  showCategory?: boolean;
  showImage?: boolean;
}

/**
 * Zod schema for blog-list props validation.
 */
export const BlogListSchema = z
  .object({
    heading: optStr(200),
    limit: z.number().int().min(1).max(24),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    cardVariant: z.enum(["default", "minimal", "card"]).optional(),
    showExcerpt: z.boolean().optional(),
    showDate: z.boolean().optional(),
    showCategory: z.boolean().optional(),
    showImage: z.boolean().optional(),
  })
  .strict();

export type BlogListInput = z.infer<typeof BlogListSchema>;
