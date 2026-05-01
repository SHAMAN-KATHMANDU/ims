import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * FBT — frequently bought together section.
 */
export interface FbtProps {
  heading?: string;
  productIdSource?: "current-pdp" | "explicit";
  productId?: string;
  limit?: number;
  columns?: 2 | 3 | 4;
  cardVariant?: "bordered" | "bare" | "card";
}

/**
 * Zod schema for fbt props validation.
 */
export const FbtSchema = z
  .object({
    heading: optStr(200),
    productIdSource: z.enum(["current-pdp", "explicit"]).optional(),
    productId: optStr(80),
    limit: z.number().int().min(1).max(12).optional(),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
    cardVariant: z.enum(["bordered", "bare", "card"]).optional(),
  })
  .strict();

export type FbtInput = z.infer<typeof FbtSchema>;
