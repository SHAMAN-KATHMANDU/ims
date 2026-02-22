import { describe, it, expect } from "vitest";
import {
  adjustInventorySchema,
  inventoryLocationParamsSchema,
  inventoryProductParamsSchema,
  locationInventoryQuerySchema,
  setInventorySchema,
} from "./inventory.schema";

describe("inventory schemas", () => {
  describe("adjustInventorySchema", () => {
    it("accepts valid adjust payload and trims strings", () => {
      const parsed = adjustInventorySchema.parse({
        locationId: " loc-1 ",
        variationId: " var-1 ",
        quantity: 5,
        reason: " restock ",
      });
      expect(parsed.locationId).toBe("loc-1");
      expect(parsed.variationId).toBe("var-1");
      expect(parsed.quantity).toBe(5);
      expect(parsed.reason).toBe("restock");
    });

    it("accepts negative quantity for deduction", () => {
      const parsed = adjustInventorySchema.parse({
        locationId: "loc-1",
        variationId: "var-1",
        quantity: -2,
      });
      expect(parsed.quantity).toBe(-2);
    });

    it("rejects zero quantity", () => {
      const result = adjustInventorySchema.safeParse({
        locationId: "loc-1",
        variationId: "var-1",
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing locationId", () => {
      const result = adjustInventorySchema.safeParse({
        variationId: "var-1",
        quantity: 1,
      });
      expect(result.success).toBe(false);
    });

    it("coerces string quantity to number", () => {
      const parsed = adjustInventorySchema.parse({
        locationId: "loc-1",
        variationId: "var-1",
        quantity: "10",
      });
      expect(parsed.quantity).toBe(10);
    });
  });

  describe("setInventorySchema", () => {
    it("accepts valid set payload", () => {
      const parsed = setInventorySchema.parse({
        locationId: "loc-1",
        variationId: "var-1",
        quantity: 0,
      });
      expect(parsed.quantity).toBe(0);
    });

    it("rejects negative quantity", () => {
      const result = setInventorySchema.safeParse({
        locationId: "loc-1",
        variationId: "var-1",
        quantity: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing variationId", () => {
      const result = setInventorySchema.safeParse({
        locationId: "loc-1",
        quantity: 5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("params/query schemas", () => {
    it("validates location/product params schemas", () => {
      const locationParams = inventoryLocationParamsSchema.parse({
        locationId: "loc-1",
      });
      const productParams = inventoryProductParamsSchema.parse({
        productId: "prod-1",
      });

      expect(locationParams.locationId).toBe("loc-1");
      expect(productParams.productId).toBe("prod-1");
    });

    it("validates location inventory query schema", () => {
      const parsed = locationInventoryQuerySchema.parse({
        page: "2",
        limit: "50",
        categoryId: "cat-1",
      });

      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(50);
      expect(parsed.categoryId).toBe("cat-1");
    });
  });
});
