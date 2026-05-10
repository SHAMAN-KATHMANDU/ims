import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * PromoCards props — render the tenant's currently-active promo codes
 * as a grid/list of cards. Data binds at render time from
 * BlockDataContext.promos (only active, non-expired codes whose tenant
 * matches the request host).
 */
export interface PromoCardsProps {
  heading?: string;
  subtitle?: string;
  /** Show the promo code prominently so customers can copy it. */
  showCode?: boolean;
  /** Show the discount value (e.g. "20% off" or "NPR 500 off"). */
  showValue?: boolean;
  /** Max number of cards to display. */
  limit?: number;
  /** Layout — single-column list or multi-column grid. */
  layout?: "grid" | "list";
  /** Grid columns when layout=grid. */
  columns?: 2 | 3 | 4;
}

/**
 * Zod schema for promo-cards props validation.
 */
export const PromoCardsSchema = z
  .object({
    heading: optStr(200),
    subtitle: optStr(400),
    showCode: z.boolean().optional(),
    showValue: z.boolean().optional(),
    limit: z.number().int().min(1).max(50).optional(),
    layout: z.enum(["grid", "list"]).optional(),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
  })
  .strict();

export type PromoCardsInput = z.infer<typeof PromoCardsSchema>;
