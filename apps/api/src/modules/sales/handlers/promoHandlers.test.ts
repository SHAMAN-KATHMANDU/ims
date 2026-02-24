import { describe, it, expect } from "vitest";
import { promoStrategy, type PromoContext } from "./promoHandlers";

const mkPromo = (opts: {
  overrideDiscounts?: boolean;
  allowStacking?: boolean;
  eligibility: string;
  productIds?: string[];
}) => ({
  overrideDiscounts: opts.overrideDiscounts ?? false,
  allowStacking: opts.allowStacking ?? false,
  eligibility: opts.eligibility,
  products: (opts.productIds ?? []).map((productId) => ({ productId })),
});

const baseCtx: PromoContext = {
  promoAmount: 30,
  baseAmount: 10,
  basePercent: 15,
  basePercentValue: 15,
  itemSubtotal: 100,
};

describe("promoStrategy", () => {
  describe("isProductEligible", () => {
    it("returns true when productId is in promo products", () => {
      const promo = mkPromo({ eligibility: "ALL", productIds: ["p1", "p2"] });
      expect(promoStrategy.isProductEligible(promo, "p1")).toBe(true);
      expect(promoStrategy.isProductEligible(promo, "p2")).toBe(true);
    });

    it("returns false when productId is not in promo products", () => {
      const promo = mkPromo({ eligibility: "ALL", productIds: ["p1"] });
      expect(promoStrategy.isProductEligible(promo, "p2")).toBe(false);
    });

    it("returns false when promo has no products", () => {
      const promo = mkPromo({ eligibility: "ALL", productIds: [] });
      expect(promoStrategy.isProductEligible(promo, "p1")).toBe(false);
    });
  });

  describe("isCustomerEligible", () => {
    it("returns true when eligibility is ALL", () => {
      const promo = mkPromo({ eligibility: "ALL" });
      expect(promoStrategy.isCustomerEligible(promo, "GENERAL")).toBe(true);
      expect(promoStrategy.isCustomerEligible(promo, "MEMBER")).toBe(true);
    });

    it("returns true only for MEMBER when eligibility is MEMBER", () => {
      const promo = mkPromo({ eligibility: "MEMBER" });
      expect(promoStrategy.isCustomerEligible(promo, "MEMBER")).toBe(true);
      expect(promoStrategy.isCustomerEligible(promo, "GENERAL")).toBe(false);
    });

    it("returns true only for GENERAL when eligibility is NON_MEMBER", () => {
      const promo = mkPromo({ eligibility: "NON_MEMBER" });
      expect(promoStrategy.isCustomerEligible(promo, "GENERAL")).toBe(true);
      expect(promoStrategy.isCustomerEligible(promo, "MEMBER")).toBe(false);
    });

    it("returns false for unknown eligibility", () => {
      const promo = mkPromo({ eligibility: "WHOLESALE" });
      expect(promoStrategy.isCustomerEligible(promo, "GENERAL")).toBe(false);
      expect(promoStrategy.isCustomerEligible(promo, "MEMBER")).toBe(false);
    });
  });

  describe("apply", () => {
    it("override mode: uses only promo amount, no base", () => {
      const promo = mkPromo({ eligibility: "ALL", overrideDiscounts: true });
      const result = promoStrategy.apply(promo, baseCtx);
      expect(result.amount).toBe(30);
      expect(result.discountAmount).toBe(30);
      expect(result.discountPercent).toBe(0);
    });

    it("stack mode: adds promo to base amount, keeps base percent", () => {
      const promo = mkPromo({ eligibility: "ALL", allowStacking: true });
      const result = promoStrategy.apply(promo, baseCtx);
      expect(result.amount).toBe(30);
      expect(result.discountAmount).toBe(10 + 30);
      expect(result.discountPercent).toBe(15);
    });

    it("replace_if_higher: when promo > base total, replaces with promo", () => {
      const ctx: PromoContext = {
        ...baseCtx,
        promoAmount: 50,
        baseAmount: 10,
        basePercentValue: 15,
      };
      const promo = mkPromo({ eligibility: "ALL" });
      const result = promoStrategy.apply(promo, ctx);
      expect(result.amount).toBe(50);
      expect(result.discountAmount).toBe(50);
      expect(result.discountPercent).toBe(0);
    });

    it("replace_if_higher: when promo <= base total, keeps base", () => {
      const ctx: PromoContext = {
        ...baseCtx,
        promoAmount: 5,
        baseAmount: 10,
        basePercentValue: 15,
      };
      const promo = mkPromo({ eligibility: "ALL" });
      const result = promoStrategy.apply(promo, ctx);
      expect(result.amount).toBe(0);
      expect(result.discountAmount).toBe(10);
      expect(result.discountPercent).toBe(15);
    });

    it("override takes precedence over allowStacking when both true", () => {
      const promo = mkPromo({
        eligibility: "ALL",
        overrideDiscounts: true,
        allowStacking: true,
      });
      const result = promoStrategy.apply(promo, baseCtx);
      expect(result.discountAmount).toBe(30);
      expect(result.discountPercent).toBe(0);
    });
  });
});
