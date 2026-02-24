/**
 * Promo strategy - replaces nested if/else for promo override/stack/replace logic.
 */

type PromoMode = "override" | "stack" | "replace_if_higher";

export interface PromoContext {
  promoAmount: number;
  baseAmount: number;
  basePercent: number;
  basePercentValue: number;
  itemSubtotal: number;
}

export interface PromoResult {
  amount: number;
  discountAmount: number;
  discountPercent: number;
}

const promoModeHandlers: Record<PromoMode, (ctx: PromoContext) => PromoResult> =
  {
    override: (ctx) => ({
      amount: ctx.promoAmount,
      discountAmount: ctx.promoAmount,
      discountPercent: 0,
    }),
    stack: (ctx) => ({
      amount: ctx.promoAmount,
      discountAmount: ctx.baseAmount + ctx.promoAmount,
      discountPercent: ctx.basePercent,
    }),
    replace_if_higher: (ctx) => {
      const baseTotal = ctx.baseAmount + ctx.basePercentValue;
      return ctx.promoAmount > baseTotal
        ? {
            amount: ctx.promoAmount,
            discountAmount: ctx.promoAmount,
            discountPercent: 0,
          }
        : {
            amount: 0,
            discountAmount: ctx.baseAmount,
            discountPercent: ctx.basePercent,
          };
    },
  };

type PromoCodeLike = {
  overrideDiscounts: boolean;
  allowStacking: boolean;
  eligibility: string;
  products: { productId: string }[];
};

export const promoStrategy = {
  isProductEligible(promo: PromoCodeLike, productId: string): boolean {
    return promo.products.some((pp) => pp.productId === productId);
  },

  isCustomerEligible(
    promo: PromoCodeLike,
    saleType: "GENERAL" | "MEMBER",
  ): boolean {
    if (promo.eligibility === "ALL") return true;
    if (promo.eligibility === "MEMBER") return saleType === "MEMBER";
    if (promo.eligibility === "NON_MEMBER") return saleType === "GENERAL";
    return false;
  },

  apply(promo: PromoCodeLike, ctx: PromoContext): PromoResult {
    const mode: PromoMode = promo.overrideDiscounts
      ? "override"
      : promo.allowStacking
        ? "stack"
        : "replace_if_higher";
    return promoModeHandlers[mode](ctx);
  },
};
