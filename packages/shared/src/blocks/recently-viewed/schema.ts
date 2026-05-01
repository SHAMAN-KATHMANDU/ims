import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Recently viewed — browsing history carousel.
 */
export interface RecentlyViewedProps {
  heading?: string;
  limit?: number;
  columns?: 2 | 3 | 4;
  cardVariant?: "bordered" | "bare" | "card";
  hideWhenEmpty?: boolean;
  excludeCurrent?: boolean;
}

/**
 * Zod schema for recently-viewed props validation.
 */
export const RecentlyViewedSchema = z
  .object({
    heading: optStr(200),
    limit: z.number().int().min(1).max(12).optional(),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
    cardVariant: z.enum(["bordered", "bare", "card"]).optional(),
    hideWhenEmpty: z.boolean().optional(),
    excludeCurrent: z.boolean().optional(),
  })
  .strict();

export type RecentlyViewedInput = z.infer<typeof RecentlyViewedSchema>;
