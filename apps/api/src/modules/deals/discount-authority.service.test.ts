import { describe, it, expect } from "vitest";
import { checkDiscountAuthority } from "./discount-authority.service";

describe("checkDiscountAuthority", () => {
  describe("no discount (<= 0)", () => {
    it("auto-approves when discountPercent is 0", () => {
      const result = checkDiscountAuthority({
        pipelineType: "NEW_SALES",
        purchaseCount: 0,
        discountPercent: 0,
      });
      expect(result.authority).toBe("AUTO_APPROVED");
      expect(result.reason).toBe("No discount applied");
    });

    it("auto-approves when discountPercent is negative", () => {
      const result = checkDiscountAuthority({
        pipelineType: "GENERAL",
        purchaseCount: 5,
        discountPercent: -5,
      });
      expect(result.authority).toBe("AUTO_APPROVED");
      expect(result.reason).toBe("No discount applied");
    });

    it("still reports the correct maxAutoApprovePercent for the context", () => {
      const result = checkDiscountAuthority({
        pipelineType: "REPURCHASE",
        purchaseCount: 3,
        discountPercent: 0,
      });
      // REPURCHASE + purchaseCount >= 3 → 20
      expect(result.maxAutoApprovePercent).toBe(20);
    });
  });

  describe("hard ceiling (> 30%)", () => {
    it("blocks discounts above 30% regardless of pipeline/purchaseCount", () => {
      const result = checkDiscountAuthority({
        pipelineType: "REPURCHASE",
        purchaseCount: 10,
        discountPercent: 31,
      });
      expect(result.authority).toBe("BLOCKED");
      expect(result.reason).toMatch(/30%/);
    });

    it("blocks extreme discounts", () => {
      const result = checkDiscountAuthority({
        pipelineType: "REMARKETING",
        purchaseCount: 0,
        discountPercent: 100,
      });
      expect(result.authority).toBe("BLOCKED");
    });

    it("allows exactly 30% (boundary is >, not >=)", () => {
      const result = checkDiscountAuthority({
        pipelineType: "REPURCHASE",
        purchaseCount: 3,
        discountPercent: 30,
      });
      // REPURCHASE + 3+ → maxAuto 20 → 30 > 20 → HUMAN_REVIEW (not BLOCKED)
      expect(result.authority).toBe("HUMAN_REVIEW");
    });
  });

  describe("NEW_SALES pipeline", () => {
    it("auto-approves up to 5% for a brand-new lead (purchaseCount 0)", () => {
      const result = checkDiscountAuthority({
        pipelineType: "NEW_SALES",
        purchaseCount: 0,
        discountPercent: 5,
      });
      expect(result.authority).toBe("AUTO_APPROVED");
      expect(result.maxAutoApprovePercent).toBe(5);
    });

    it("sends to HUMAN_REVIEW when a new lead exceeds 5%", () => {
      const result = checkDiscountAuthority({
        pipelineType: "NEW_SALES",
        purchaseCount: 0,
        discountPercent: 6,
      });
      expect(result.authority).toBe("HUMAN_REVIEW");
      expect(result.maxAutoApprovePercent).toBe(5);
    });

    it("auto-approves up to 10% once the contact has purchased once", () => {
      const result = checkDiscountAuthority({
        pipelineType: "NEW_SALES",
        purchaseCount: 1,
        discountPercent: 10,
      });
      expect(result.authority).toBe("AUTO_APPROVED");
      expect(result.maxAutoApprovePercent).toBe(10);
    });

    it("sends to HUMAN_REVIEW when returning buyer exceeds 10%", () => {
      const result = checkDiscountAuthority({
        pipelineType: "NEW_SALES",
        purchaseCount: 2,
        discountPercent: 11,
      });
      expect(result.authority).toBe("HUMAN_REVIEW");
    });
  });

  describe("REMARKETING pipeline", () => {
    it("auto-approves up to 15% regardless of purchaseCount", () => {
      const result = checkDiscountAuthority({
        pipelineType: "REMARKETING",
        purchaseCount: 0,
        discountPercent: 15,
      });
      expect(result.authority).toBe("AUTO_APPROVED");
      expect(result.maxAutoApprovePercent).toBe(15);
    });

    it("sends to HUMAN_REVIEW above 15%", () => {
      const result = checkDiscountAuthority({
        pipelineType: "REMARKETING",
        purchaseCount: 10,
        discountPercent: 16,
      });
      expect(result.authority).toBe("HUMAN_REVIEW");
    });
  });

  describe("REPURCHASE pipeline", () => {
    it("auto-approves up to 10% for a first-time repurchase (count 1)", () => {
      const result = checkDiscountAuthority({
        pipelineType: "REPURCHASE",
        purchaseCount: 1,
        discountPercent: 10,
      });
      expect(result.authority).toBe("AUTO_APPROVED");
      expect(result.maxAutoApprovePercent).toBe(10);
    });

    it("auto-approves up to 15% for a 2nd-time buyer", () => {
      const result = checkDiscountAuthority({
        pipelineType: "REPURCHASE",
        purchaseCount: 2,
        discountPercent: 15,
      });
      expect(result.authority).toBe("AUTO_APPROVED");
      expect(result.maxAutoApprovePercent).toBe(15);
    });

    it("auto-approves up to 20% for a VIP buyer (count >= 3)", () => {
      const result = checkDiscountAuthority({
        pipelineType: "REPURCHASE",
        purchaseCount: 3,
        discountPercent: 20,
      });
      expect(result.authority).toBe("AUTO_APPROVED");
      expect(result.maxAutoApprovePercent).toBe(20);
    });

    it("tier boundary — count 2 does NOT get the VIP 20% band", () => {
      const result = checkDiscountAuthority({
        pipelineType: "REPURCHASE",
        purchaseCount: 2,
        discountPercent: 20,
      });
      // maxAuto for count 2 is 15, so 20 > 15 → HUMAN_REVIEW
      expect(result.authority).toBe("HUMAN_REVIEW");
      expect(result.maxAutoApprovePercent).toBe(15);
    });

    it("sends to HUMAN_REVIEW above VIP 20%", () => {
      const result = checkDiscountAuthority({
        pipelineType: "REPURCHASE",
        purchaseCount: 10,
        discountPercent: 25,
      });
      expect(result.authority).toBe("HUMAN_REVIEW");
    });
  });

  describe("GENERAL pipeline", () => {
    it("auto-approves up to 10%", () => {
      const result = checkDiscountAuthority({
        pipelineType: "GENERAL",
        purchaseCount: 0,
        discountPercent: 10,
      });
      expect(result.authority).toBe("AUTO_APPROVED");
      expect(result.maxAutoApprovePercent).toBe(10);
    });

    it("sends to HUMAN_REVIEW above 10%", () => {
      const result = checkDiscountAuthority({
        pipelineType: "GENERAL",
        purchaseCount: 99,
        discountPercent: 11,
      });
      expect(result.authority).toBe("HUMAN_REVIEW");
      expect(result.maxAutoApprovePercent).toBe(10);
    });
  });

  describe("result shape", () => {
    it("always returns a human-readable reason string", () => {
      const cases: Array<Parameters<typeof checkDiscountAuthority>[0]> = [
        { pipelineType: "NEW_SALES", purchaseCount: 0, discountPercent: 0 },
        { pipelineType: "NEW_SALES", purchaseCount: 0, discountPercent: 50 },
        { pipelineType: "REMARKETING", purchaseCount: 5, discountPercent: 10 },
        { pipelineType: "REPURCHASE", purchaseCount: 3, discountPercent: 25 },
      ];
      for (const input of cases) {
        const r = checkDiscountAuthority(input);
        expect(typeof r.reason).toBe("string");
        expect(r.reason.length).toBeGreaterThan(0);
        expect(typeof r.maxAutoApprovePercent).toBe("number");
      }
    });
  });
});
