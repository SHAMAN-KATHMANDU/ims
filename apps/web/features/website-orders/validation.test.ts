import { describe, it, expect } from "vitest";
import {
  RejectOrderFormSchema,
  ConvertOrderFormSchema,
  formatMoney,
} from "./validation";

describe("RejectOrderFormSchema", () => {
  it("accepts a valid reason", () => {
    const r = RejectOrderFormSchema.parse({ reason: "spam call" });
    expect(r.reason).toBe("spam call");
  });

  it("rejects an empty reason", () => {
    expect(() => RejectOrderFormSchema.parse({ reason: "" })).toThrow();
  });

  it("rejects a reason over 500 chars", () => {
    expect(() =>
      RejectOrderFormSchema.parse({ reason: "x".repeat(600) }),
    ).toThrow();
  });
});

describe("ConvertOrderFormSchema", () => {
  const validLoc = "11111111-1111-1111-1111-111111111111";

  it("accepts a credit sale without payments", () => {
    const r = ConvertOrderFormSchema.parse({
      locationId: validLoc,
      isCreditSale: true,
    });
    expect(r.isCreditSale).toBe(true);
  });

  it("accepts a cash sale with one payment", () => {
    const r = ConvertOrderFormSchema.parse({
      locationId: validLoc,
      payments: [{ method: "cash", amount: 1000 }],
    });
    expect(r.payments).toHaveLength(1);
  });

  it("rejects a non-credit sale without payments", () => {
    expect(() =>
      ConvertOrderFormSchema.parse({ locationId: validLoc }),
    ).toThrow();
  });

  it("rejects invalid location", () => {
    expect(() =>
      ConvertOrderFormSchema.parse({
        locationId: "nope",
        isCreditSale: true,
      }),
    ).toThrow();
  });

  it("rejects negative payment amount", () => {
    expect(() =>
      ConvertOrderFormSchema.parse({
        locationId: validLoc,
        payments: [{ method: "cash", amount: -1 }],
      }),
    ).toThrow();
  });

  it("coerces a numeric payment string", () => {
    const r = ConvertOrderFormSchema.parse({
      locationId: validLoc,
      payments: [{ method: "cash", amount: "500" }],
    });
    expect(r.payments![0]!.amount).toBe(500);
  });
});

describe("formatMoney", () => {
  it("formats a numeric string", () => {
    expect(formatMoney("1500", "NPR")).toMatch(/1,500/);
  });

  it("handles a number input", () => {
    expect(formatMoney(2500, "NPR")).toMatch(/2,500/);
  });

  it("falls through for garbage", () => {
    expect(formatMoney("not-a-number", "NPR")).toBe("not-a-number");
  });
});
