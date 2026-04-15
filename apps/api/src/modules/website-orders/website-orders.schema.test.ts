import { describe, it, expect } from "vitest";
import {
  ListWebsiteOrdersQuerySchema,
  RejectOrderSchema,
  ConvertOrderSchema,
} from "./website-orders.schema";

describe("ListWebsiteOrdersQuerySchema", () => {
  it("applies defaults", () => {
    const r = ListWebsiteOrdersQuerySchema.parse({});
    expect(r.page).toBe(1);
    expect(r.limit).toBe(20);
  });

  it("accepts a valid status", () => {
    const r = ListWebsiteOrdersQuerySchema.parse({
      status: "VERIFIED",
    });
    expect(r.status).toBe("VERIFIED");
  });

  it("rejects an unknown status", () => {
    expect(() =>
      ListWebsiteOrdersQuerySchema.parse({ status: "BOGUS" }),
    ).toThrow();
  });

  it("coerces page/limit from strings", () => {
    const r = ListWebsiteOrdersQuerySchema.parse({
      page: "3",
      limit: "50",
    });
    expect(r.page).toBe(3);
    expect(r.limit).toBe(50);
  });
});

describe("RejectOrderSchema", () => {
  it("requires a non-empty reason", () => {
    expect(() => RejectOrderSchema.parse({ reason: "" })).toThrow();
  });

  it("accepts a reason up to 500 chars", () => {
    const r = RejectOrderSchema.parse({ reason: "spam call" });
    expect(r.reason).toBe("spam call");
  });

  it("rejects >500 char reason", () => {
    expect(() =>
      RejectOrderSchema.parse({ reason: "x".repeat(600) }),
    ).toThrow();
  });
});

describe("ConvertOrderSchema", () => {
  it("requires a uuid locationId", () => {
    expect(() => ConvertOrderSchema.parse({ locationId: "nope" })).toThrow();
  });

  it("accepts the minimum valid payload", () => {
    const r = ConvertOrderSchema.parse({
      locationId: "11111111-1111-1111-1111-111111111111",
    });
    expect(r.locationId).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("accepts an optional itemOverrides list", () => {
    const r = ConvertOrderSchema.parse({
      locationId: "11111111-1111-1111-1111-111111111111",
      itemOverrides: [
        {
          productId: "22222222-2222-2222-2222-222222222222",
          variationId: "33333333-3333-3333-3333-333333333333",
          quantity: 2,
        },
      ],
    });
    expect(r.itemOverrides).toHaveLength(1);
  });

  it("accepts optional payments", () => {
    const r = ConvertOrderSchema.parse({
      locationId: "11111111-1111-1111-1111-111111111111",
      payments: [
        { method: "cash", amount: 100 },
        { method: "card", amount: 50 },
      ],
    });
    expect(r.payments).toHaveLength(2);
  });

  it("rejects a negative payment amount", () => {
    expect(() =>
      ConvertOrderSchema.parse({
        locationId: "11111111-1111-1111-1111-111111111111",
        payments: [{ method: "cash", amount: -1 }],
      }),
    ).toThrow();
  });
});
