import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * A single volume-pricing tier.
 *
 *   minQty — qty at which this tier kicks in (inclusive)
 *   maxQty — last qty in this tier (inclusive). Omit for the open-ended top tier.
 *   price  — unit price at this tier (in the storefront currency)
 *   label  — optional human label (e.g. "Wholesale", "Bulk")
 */
export interface PriceTier {
  minQty: number;
  maxQty?: number;
  price: number;
  label?: string;
}

/**
 * Volume / wholesale price tiers. Pairs with pdp-buybox on B2B PDPs.
 *
 * The renderer reads the active line qty from BlockDataContext and
 * highlights the matching tier when `highlightActive` is true.
 */
export interface PriceTiersProps {
  tiers: PriceTier[];
  /** Highlight the row matching the current cart qty. Defaults to true. */
  highlightActive?: boolean;
  /** Currency code (ISO 4217). Defaults to the site's currency. */
  currency?: string;
  /** Heading rendered above the tier table. */
  heading?: string;
  /** Microcopy shown below the table. */
  footnote?: string;
}

export const PriceTiersSchema = z
  .object({
    tiers: z
      .array(
        z
          .object({
            minQty: z.number().int().min(1),
            maxQty: z.number().int().min(1).optional(),
            price: z.number().nonnegative(),
            label: optStr(40),
          })
          .strict()
          .superRefine((val, ctx) => {
            if (val.maxQty !== undefined && val.maxQty < val.minQty) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "maxQty must be greater than or equal to minQty",
                path: ["maxQty"],
              });
            }
          }),
      )
      .min(1)
      .max(8),
    highlightActive: z.boolean().optional(),
    currency: optStr(8),
    heading: optStr(80),
    footnote: optStr(200),
  })
  .strict();

export type PriceTiersInput = z.infer<typeof PriceTiersSchema>;
