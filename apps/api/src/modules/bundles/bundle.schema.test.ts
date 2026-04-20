import { describe, it, expect } from "vitest";
import {
  CreateBundleSchema,
  UpdateBundleSchema,
  BundleListQuerySchema,
} from "./bundle.schema";

describe("CreateBundleSchema", () => {
  it("accepts minimal valid payload", () => {
    const result = CreateBundleSchema.parse({
      name: "Starter Pack",
      slug: "starter-pack",
      productIds: [],
    });
    expect(result.name).toBe("Starter Pack");
    expect(result.slug).toBe("starter-pack");
    expect(result.pricingStrategy).toBe("SUM");
    expect(result.active).toBe(true);
  });

  it("normalizes slug to lowercase", () => {
    const result = CreateBundleSchema.parse({
      name: "X",
      slug: "Starter-Pack",
      productIds: [],
    });
    expect(result.slug).toBe("starter-pack");
  });

  it("rejects slug with spaces or special chars", () => {
    expect(() =>
      CreateBundleSchema.parse({
        name: "X",
        slug: "not a slug!",
        productIds: [],
      }),
    ).toThrow();
  });

  it("requires discountPct when pricingStrategy=DISCOUNT_PCT", () => {
    expect(() =>
      CreateBundleSchema.parse({
        name: "X",
        slug: "x",
        productIds: [],
        pricingStrategy: "DISCOUNT_PCT",
      }),
    ).toThrow(/discountPct/);
  });

  it("requires fixedPrice when pricingStrategy=FIXED", () => {
    expect(() =>
      CreateBundleSchema.parse({
        name: "X",
        slug: "x",
        productIds: [],
        pricingStrategy: "FIXED",
      }),
    ).toThrow(/fixedPrice/);
  });

  it("accepts FIXED with fixedPrice", () => {
    const r = CreateBundleSchema.parse({
      name: "X",
      slug: "x",
      productIds: [],
      pricingStrategy: "FIXED",
      fixedPrice: 9900,
    });
    expect(r.fixedPrice).toBe(9900);
  });

  it("clamps discountPct to 0-100", () => {
    expect(() =>
      CreateBundleSchema.parse({
        name: "X",
        slug: "x",
        productIds: [],
        pricingStrategy: "DISCOUNT_PCT",
        discountPct: 150,
      }),
    ).toThrow();
  });

  it("rejects non-uuid productIds", () => {
    expect(() =>
      CreateBundleSchema.parse({
        name: "X",
        slug: "x",
        productIds: ["not-a-uuid"],
      }),
    ).toThrow();
  });
});

describe("UpdateBundleSchema", () => {
  it("accepts partial update", () => {
    const r = UpdateBundleSchema.parse({ name: "New Name" });
    expect(r.name).toBe("New Name");
    expect(r.slug).toBeUndefined();
  });

  it("still enforces pricing conditional when strategy changes", () => {
    expect(() =>
      UpdateBundleSchema.parse({
        pricingStrategy: "FIXED",
      }),
    ).toThrow(/fixedPrice/);
  });
});

describe("BundleListQuerySchema", () => {
  it("parses active=true to boolean", () => {
    const r = BundleListQuerySchema.parse({ active: "true" });
    expect(r.active).toBe(true);
  });
  it("parses active=false to boolean", () => {
    const r = BundleListQuerySchema.parse({ active: "false" });
    expect(r.active).toBe(false);
  });
  it("leaves active undefined when absent", () => {
    const r = BundleListQuerySchema.parse({});
    expect(r.active).toBeUndefined();
  });
});
