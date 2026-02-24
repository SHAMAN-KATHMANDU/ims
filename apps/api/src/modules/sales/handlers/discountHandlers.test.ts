import { describe, it, expect } from "vitest";
import { discountStrategy } from "./discountHandlers";

const mkDiscount = (opts: {
  valueType: string;
  value: number;
  typeName: string;
}) => ({
  valueType: opts.valueType,
  value: opts.value,
  discountType: { name: opts.typeName },
});

describe("discountStrategy", () => {
  describe("selectEligibleDiscounts", () => {
    it("returns empty array when discounts is empty", () => {
      expect(
        discountStrategy.selectEligibleDiscounts([], "GENERAL", 100),
      ).toEqual([]);
    });

    it("returns empty array when discounts is null/undefined (treated as empty)", () => {
      expect(
        discountStrategy.selectEligibleDiscounts(
          undefined as unknown as never[],
          "GENERAL",
          100,
        ),
      ).toEqual([]);
    });

    it("filters by saleType MEMBER: includes member and non-member types", () => {
      const discounts = [
        mkDiscount({ valueType: "PERCENTAGE", value: 10, typeName: "Member" }),
        mkDiscount({
          valueType: "PERCENTAGE",
          value: 5,
          typeName: "Non-Member",
        }),
        mkDiscount({
          valueType: "PERCENTAGE",
          value: 15,
          typeName: "Wholesale",
        }),
      ];
      const result = discountStrategy.selectEligibleDiscounts(
        discounts,
        "MEMBER",
        100,
      );
      expect(result).toHaveLength(2);
      expect(result.map((d) => d.discountType.name)).toContain("Member");
      expect(result.map((d) => d.discountType.name)).toContain("Non-Member");
      expect(result.map((d) => d.discountType.name)).not.toContain("Wholesale");
    });

    it("filters by saleType GENERAL: includes non-member and wholesale types", () => {
      const discounts = [
        mkDiscount({ valueType: "PERCENTAGE", value: 10, typeName: "Member" }),
        mkDiscount({
          valueType: "PERCENTAGE",
          value: 5,
          typeName: "Non-Member",
        }),
        mkDiscount({
          valueType: "PERCENTAGE",
          value: 15,
          typeName: "Wholesale",
        }),
      ];
      const result = discountStrategy.selectEligibleDiscounts(
        discounts,
        "GENERAL",
        100,
      );
      expect(result).toHaveLength(2);
      expect(result.map((d) => d.discountType.name)).toContain("Non-Member");
      expect(result.map((d) => d.discountType.name)).toContain("Wholesale");
      expect(result.map((d) => d.discountType.name)).not.toContain("Member");
    });

    it("sorts eligible discounts by value (highest first): percentage then flat", () => {
      const discounts = [
        mkDiscount({
          valueType: "PERCENTAGE",
          value: 10,
          typeName: "Non-Member",
        }),
        mkDiscount({
          valueType: "PERCENTAGE",
          value: 20,
          typeName: "Wholesale",
        }),
        mkDiscount({ valueType: "FLAT", value: 15, typeName: "Non-Member" }),
      ];
      const result = discountStrategy.selectEligibleDiscounts(
        discounts,
        "GENERAL",
        100,
      );
      expect(result).toHaveLength(3);
      expect(result[0].discountType.name).toBe("Wholesale");
      expect(Number(result[0].value)).toBe(20);
      expect(result[1].valueType).toBe("FLAT");
      expect(Number(result[1].value)).toBe(15);
      expect(result[2].valueType).toBe("PERCENTAGE");
      expect(Number(result[2].value)).toBe(10);
    });
  });

  describe("selectBaseDiscount", () => {
    it("returns zero when variation has no discounts", () => {
      const variation = { product: { discounts: [] } };
      expect(
        discountStrategy.selectBaseDiscount(variation, "GENERAL", 100),
      ).toEqual({ discountAmount: 0, discountPercent: 0 });
    });

    it("returns zero when variation.product is missing", () => {
      const variation = {
        product: undefined as unknown as { discounts: never[] },
      };
      expect(
        discountStrategy.selectBaseDiscount(variation, "GENERAL", 100),
      ).toEqual({ discountAmount: 0, discountPercent: 0 });
    });

    it("returns FLAT discount as discountAmount only", () => {
      const variation = {
        product: {
          discounts: [
            mkDiscount({
              valueType: "FLAT",
              value: 25,
              typeName: "Non-Member",
            }),
          ],
        },
      };
      expect(
        discountStrategy.selectBaseDiscount(variation, "GENERAL", 100),
      ).toEqual({ discountAmount: 25, discountPercent: 0 });
    });

    it("returns PERCENTAGE discount as discountPercent only", () => {
      const variation = {
        product: {
          discounts: [
            mkDiscount({
              valueType: "PERCENTAGE",
              value: 15,
              typeName: "Non-Member",
            }),
          ],
        },
      };
      expect(
        discountStrategy.selectBaseDiscount(variation, "GENERAL", 100),
      ).toEqual({ discountAmount: 0, discountPercent: 15 });
    });

    it("picks best eligible discount for saleType", () => {
      const variation = {
        product: {
          discounts: [
            mkDiscount({
              valueType: "PERCENTAGE",
              value: 5,
              typeName: "Member",
            }),
            mkDiscount({
              valueType: "PERCENTAGE",
              value: 20,
              typeName: "Non-Member",
            }),
          ],
        },
      };
      const general = discountStrategy.selectBaseDiscount(
        variation,
        "GENERAL",
        100,
      );
      expect(general).toEqual({ discountAmount: 0, discountPercent: 20 });

      const member = discountStrategy.selectBaseDiscount(
        variation,
        "MEMBER",
        100,
      );
      expect(member).toEqual({ discountAmount: 0, discountPercent: 20 });
    });
  });
});
