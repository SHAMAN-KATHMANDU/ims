import { describe, expect, it } from "vitest";
import {
  createProductSchema,
  productDiscountsListQuerySchema,
  productIdParamsSchema,
  productsListQuerySchema,
  updateProductSchema,
} from "./product.schema";

describe("product schemas", () => {
  it("validates create payload with categoryId", () => {
    const parsed = createProductSchema.parse({
      imsCode: " IMS-1 ",
      name: " Phone ",
      categoryId: "cat-1",
      locationId: "loc-1",
      costPrice: "1000",
      mrp: "1200",
      variations: [{ color: " Black ", stockQuantity: "2" }],
    });

    expect(parsed.imsCode).toBe("IMS-1");
    expect(parsed.name).toBe("Phone");
    expect(parsed.costPrice).toBe(1000);
    expect(parsed.mrp).toBe(1200);
    expect(parsed.variations?.[0]?.color).toBe("Black");
    expect(parsed.variations?.[0]?.stockQuantity).toBe(2);
  });

  it("validates create payload with categoryName", () => {
    const parsed = createProductSchema.parse({
      imsCode: "IMS-2",
      name: "Headphone",
      categoryName: "Electronics",
      locationId: "loc-1",
      costPrice: 500,
      mrp: 800,
    });
    expect(parsed.categoryName).toBe("Electronics");
  });

  it("rejects create payload when both category fields missing", () => {
    const result = createProductSchema.safeParse({
      imsCode: "IMS-3",
      name: "Speaker",
      locationId: "loc-1",
      costPrice: 200,
      mrp: 300,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid discount identifier", () => {
    const result = createProductSchema.safeParse({
      imsCode: "IMS-4",
      name: "Watch",
      categoryId: "cat-1",
      locationId: "loc-1",
      costPrice: 100,
      mrp: 120,
      discounts: [{ discountPercentage: 10 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects create payload when locationId is missing", () => {
    const result = createProductSchema.safeParse({
      imsCode: "IMS-5",
      name: "Fan",
      categoryId: "cat-1",
      costPrice: 200,
      mrp: 300,
    });
    expect(result.success).toBe(false);
  });

  it("validates partial update payload", () => {
    const parsed = updateProductSchema.parse({
      name: " Updated Name ",
      costPrice: "1500",
      vendorId: null,
    });
    expect(parsed.name).toBe("Updated Name");
    expect(parsed.costPrice).toBe(1500);
    expect(parsed.vendorId).toBeNull();
  });

  it("validates productIdParamsSchema", () => {
    const parsed = productIdParamsSchema.parse({ id: "product-1" });
    expect(parsed.id).toBe("product-1");
  });

  it("validates products list query schema", () => {
    const parsed = productsListQuerySchema.parse({
      page: "1",
      limit: "15",
      sortBy: "vendorName",
      sortOrder: "asc",
      lowStock: "1",
    });

    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(15);
    expect(parsed.sortBy).toBe("vendorName");
    expect(parsed.lowStock).toBe(true);
  });

  it("validates product discounts list query schema", () => {
    const parsed = productDiscountsListQuerySchema.parse({
      productId: "p-1",
      sortBy: "discountTypeName",
      sortOrder: "desc",
    });

    expect(parsed.productId).toBe("p-1");
    expect(parsed.sortBy).toBe("discountTypeName");
    expect(parsed.sortOrder).toBe("desc");
  });
});
