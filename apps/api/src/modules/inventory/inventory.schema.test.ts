import { describe, it, expect } from "vitest";
import { AdjustInventorySchema, SetInventorySchema } from "./inventory.schema";

describe("AdjustInventorySchema", () => {
  it("accepts valid body", () => {
    const result = AdjustInventorySchema.parse({
      locationId: "loc-1",
      variationId: "var-1",
      quantity: 5,
    });
    expect(result.locationId).toBe("loc-1");
    expect(result.quantity).toBe(5);
  });

  it("coerces quantity string to number", () => {
    const result = AdjustInventorySchema.parse({
      locationId: "loc-1",
      variationId: "var-1",
      quantity: "10",
    });
    expect(result.quantity).toBe(10);
  });
});

describe("SetInventorySchema", () => {
  it("accepts valid body", () => {
    const result = SetInventorySchema.parse({
      locationId: "loc-1",
      variationId: "var-1",
      quantity: 0,
    });
    expect(result.quantity).toBe(0);
  });
});
