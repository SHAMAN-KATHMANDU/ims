import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Order summary — subtotal / shipping / tax / total + checkout CTA.
 *
 * Pairs with cart-line-items on the cart page. Subtotal/total values come
 * from BlockDataContext.cart at render time.
 */
export interface OrderSummaryProps {
  /** Right column on desktop; below the line items on mobile. */
  position?: "right" | "below";
  /** Show a promo / discount code input. */
  showPromoCode?: boolean;
  /** Show the shipping estimator (zip-code lookup). */
  showShippingEstimator?: boolean;
  /** Show secure-checkout / payment-method trust badges below the CTA. */
  showTrustBadges?: boolean;
  /** Label on the primary checkout CTA. */
  checkoutLabel?: string;
  /** Microcopy below the CTA, e.g. "Trade pricing? Sign in →". */
  subText?: string;
  /** Heading shown above the summary rows. */
  heading?: string;
}

export const OrderSummarySchema = z
  .object({
    position: z.enum(["right", "below"]).optional(),
    showPromoCode: z.boolean().optional(),
    showShippingEstimator: z.boolean().optional(),
    showTrustBadges: z.boolean().optional(),
    checkoutLabel: optStr(80),
    subText: optStr(200),
    heading: optStr(80),
  })
  .strict();

export type OrderSummaryInput = z.infer<typeof OrderSummarySchema>;
