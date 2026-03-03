import { describe, it, expect, beforeEach } from "vitest";
import {
  CreatePromoSchema,
  UpdatePromoSchema,
  PromoListQuerySchema,
} from "./promo.schema";

describe("CreatePromoSchema", () => {
  beforeEach(() => {});

  it("accepts valid create payload with required fields", () => {
    const result = CreatePromoSchema.parse({
      code: "SAVE10",
      valueType: "PERCENTAGE",
      value: 10,
    });
    expect(result.code).toBe("SAVE10");
    expect(result.valueType).toBe("PERCENTAGE");
    expect(result.value).toBe(10);
    expect(result.overrideDiscounts).toBe(false);
    expect(result.allowStacking).toBe(false);
    expect(result.eligibility).toBe("ALL");
    expect(result.isActive).toBe(true);
  });

  it("accepts full payload with all optional fields", () => {
    const result = CreatePromoSchema.parse({
      code: " FLAT20 ",
      description: "20 off",
      valueType: "FLAT",
      value: 20,
      overrideDiscounts: true,
      allowStacking: true,
      eligibility: "MEMBER",
      validFrom: "2025-01-01T00:00:00Z",
      validTo: "2025-12-31T23:59:59Z",
      usageLimit: 100,
      isActive: false,
      productIds: [],
    });
    expect(result.code).toBe("FLAT20");
    expect(result.description).toBe("20 off");
    expect(result.valueType).toBe("FLAT");
    expect(result.value).toBe(20);
    expect(result.overrideDiscounts).toBe(true);
    expect(result.allowStacking).toBe(true);
    expect(result.eligibility).toBe("MEMBER");
    expect(result.usageLimit).toBe(100);
    expect(result.isActive).toBe(false);
    expect(result.productIds).toEqual([]);
  });

  it("trims code", () => {
    const result = CreatePromoSchema.parse({
      code: "  SAVE10  ",
      valueType: "PERCENTAGE",
      value: 10,
    });
    expect(result.code).toBe("SAVE10");
  });

  it("transforms empty optional strings to null", () => {
    const result = CreatePromoSchema.parse({
      code: "SAVE10",
      description: "",
      valueType: "PERCENTAGE",
      value: 10,
    });
    expect(result.description).toBeNull();
  });

  it("transforms usageLimit undefined to null", () => {
    const result = CreatePromoSchema.parse({
      code: "SAVE10",
      valueType: "PERCENTAGE",
      value: 10,
    });
    expect(result.usageLimit).toBeNull();
  });

  it("rejects when code is missing", () => {
    expect(() =>
      CreatePromoSchema.parse({
        valueType: "PERCENTAGE",
        value: 10,
      }),
    ).toThrow();
  });

  it("rejects when code is empty", () => {
    expect(() =>
      CreatePromoSchema.parse({
        code: "",
        valueType: "PERCENTAGE",
        value: 10,
      }),
    ).toThrow();
  });

  it("rejects invalid valueType", () => {
    expect(() =>
      CreatePromoSchema.parse({
        code: "SAVE10",
        valueType: "INVALID",
        value: 10,
      }),
    ).toThrow();
  });

  it("rejects invalid eligibility", () => {
    expect(() =>
      CreatePromoSchema.parse({
        code: "SAVE10",
        valueType: "PERCENTAGE",
        value: 10,
        eligibility: "INVALID",
      }),
    ).toThrow();
  });
});

describe("UpdatePromoSchema", () => {
  it("accepts empty object", () => {
    const result = UpdatePromoSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts partial update with optional fields", () => {
    const result = UpdatePromoSchema.parse({
      code: "NEWCODE",
      value: 15,
      isActive: false,
    });
    expect(result.code).toBe("NEWCODE");
    expect(result.value).toBe(15);
    expect(result.isActive).toBe(false);
  });

  it("trims code when provided", () => {
    const result = UpdatePromoSchema.parse({
      code: "  UPDATED  ",
    });
    expect(result.code).toBe("UPDATED");
  });

  it("rejects empty code when provided", () => {
    expect(() => UpdatePromoSchema.parse({ code: "" })).toThrow();
  });

  it("preserves null for usageLimit", () => {
    const result = UpdatePromoSchema.parse({ usageLimit: null });
    expect(result.usageLimit).toBeNull();
  });
});

describe("PromoListQuerySchema", () => {
  it("accepts empty object with defaults", () => {
    const result = PromoListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it("parses isActive true", () => {
    const result = PromoListQuerySchema.parse({ isActive: "true" });
    expect(result.isActive).toBe(true);
  });

  it("parses isActive false", () => {
    const result = PromoListQuerySchema.parse({ isActive: "false" });
    expect(result.isActive).toBe(false);
  });

  it("parses search", () => {
    const result = PromoListQuerySchema.parse({ search: "SAVE" });
    expect(result.search).toBe("SAVE");
  });
});
