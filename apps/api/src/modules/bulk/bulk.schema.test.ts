import { describe, it, expect } from "vitest";
import { BulkTypeSchema, BulkUploadQuerySchema } from "./bulk.schema";

describe("BulkTypeSchema", () => {
  it("accepts products, members, sales", () => {
    expect(BulkTypeSchema.parse("products")).toBe("products");
    expect(BulkTypeSchema.parse("members")).toBe("members");
    expect(BulkTypeSchema.parse("sales")).toBe("sales");
  });

  it("rejects invalid type", () => {
    expect(() => BulkTypeSchema.parse("invalid")).toThrow();
  });
});

describe("BulkUploadQuerySchema", () => {
  it("accepts type in query", () => {
    const result = BulkUploadQuerySchema.parse({ type: "products" });
    expect(result.type).toBe("products");
  });
});
