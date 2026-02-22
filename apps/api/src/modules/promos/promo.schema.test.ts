import { describe, it, expect } from "vitest";
import {
  createPromoSchema,
  promoIdParamsSchema,
  promoListQuerySchema,
  updatePromoSchema,
} from "./promo.schema";

describe("promo schemas", () => {
  it("validates createPromoSchema and normalizes fields", () => {
    const parsed = createPromoSchema.parse({
      code: "  NEW10 ",
      valueType: "PERCENTAGE",
      value: "10",
      usageLimit: "100",
      productIds: ["  p1 ", "p2"],
    });

    expect(parsed.code).toBe("NEW10");
    expect(parsed.value).toBe(10);
    expect(parsed.usageLimit).toBe(100);
    expect(parsed.productIds).toEqual(["p1", "p2"]);
  });

  it("rejects empty promo code", () => {
    const result = createPromoSchema.safeParse({
      code: "  ",
      valueType: "FLAT",
      value: 50,
    });

    expect(result.success).toBe(false);
  });

  it("validates updatePromoSchema partial payload", () => {
    const parsed = updatePromoSchema.parse({
      code: "  SAVE20 ",
      value: "20",
      description: null,
    });

    expect(parsed.code).toBe("SAVE20");
    expect(parsed.value).toBe(20);
    expect(parsed.description).toBeNull();
  });

  it("validates promo path/query schemas", () => {
    const idParsed = promoIdParamsSchema.parse({ id: "promo-1" });
    const queryParsed = promoListQuerySchema.parse({
      isActive: "true",
      page: "2",
      limit: "25",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(idParsed.id).toBe("promo-1");
    expect(queryParsed.isActive).toBe(true);
    expect(queryParsed.page).toBe(2);
    expect(queryParsed.limit).toBe(25);
  });
});
