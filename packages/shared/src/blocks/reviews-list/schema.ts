import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Reviews list — customer reviews with ratings.
 */
export interface ReviewsListProps {
  heading?: string;
  productIdSource?: "current-pdp" | "explicit";
  productId?: string;
  pageSize?: number;
  emptyMessage?: string;
  showRatingSummary?: boolean;
}

/**
 * Zod schema for reviews-list props validation.
 */
export const ReviewsListSchema = z
  .object({
    heading: optStr(200),
    productIdSource: z.enum(["current-pdp", "explicit"]).optional(),
    productId: optStr(80),
    pageSize: z.number().int().min(1).max(50).optional(),
    emptyMessage: optStr(300),
    showRatingSummary: z.boolean().optional(),
  })
  .strict();

export type ReviewsListInput = z.infer<typeof ReviewsListSchema>;
