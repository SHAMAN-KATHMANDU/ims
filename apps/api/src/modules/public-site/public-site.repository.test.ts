import { describe, it, expect, vi } from "vitest";

vi.mock("@/config/prisma", () => ({ default: {} }));

import { deriveDiscount } from "./public-site.repository";

describe("deriveDiscount", () => {
  it("returns no discount when finalSp equals mrp", () => {
    const r = deriveDiscount(100, 100, false);
    expect(r).toEqual({
      onOffer: false,
      discountPct: null,
      discountLabel: null,
    });
  });

  it("computes integer percent and label when finalSp < mrp", () => {
    const r = deriveDiscount(100, 75, false);
    expect(r).toEqual({
      onOffer: false,
      discountPct: 25,
      discountLabel: "25% OFF",
    });
  });

  it("rounds fractional percents to nearest integer", () => {
    // (100 - 67) / 100 = 33%.  (100 - 66) / 100 = 34.
    expect(deriveDiscount(100, 67, false).discountPct).toBe(33);
    expect(deriveDiscount(100, 66, false).discountPct).toBe(34);
  });

  it("returns onOffer=true without a price-based discount", () => {
    // Store sets finalSp = mrp but admin flagged an active offer.
    const r = deriveDiscount(100, 100, true);
    expect(r.onOffer).toBe(true);
    expect(r.discountPct).toBeNull();
    expect(r.discountLabel).toBeNull();
  });

  it("combines both signals", () => {
    const r = deriveDiscount(200, 150, true);
    expect(r).toEqual({
      onOffer: true,
      discountPct: 25,
      discountLabel: "25% OFF",
    });
  });

  it("handles mrp=0 gracefully (no divide-by-zero)", () => {
    const r = deriveDiscount(0, 0, false);
    expect(r.discountPct).toBeNull();
  });

  it("ignores negative finalSp and returns null", () => {
    const r = deriveDiscount(100, -10, false);
    expect(r.discountPct).toBeNull();
  });

  it("accepts Decimal-like string/number inputs", () => {
    const r = deriveDiscount("200.00", "150.00", false);
    expect(r.discountPct).toBe(25);
  });
});
