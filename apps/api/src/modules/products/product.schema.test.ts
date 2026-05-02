import { describe, it, expect } from "vitest";
import {
  CreateProductSchema,
  UpdateProductSchema,
  CreateDiscountTypeSchema,
  UpdateDiscountTypeSchema,
  GetAllProductsQuerySchema,
  DownloadProductsQuerySchema,
  GetListQuerySchema,
  GetProductDiscountsListQuerySchema,
  excelProductRowSchema,
  CreateProductTagSchema,
  UpdateProductTagSchema,
  ListProductTagsQuerySchema,
} from "./product.schema";

const minimalValidProduct = {
  imsCode: "IMS-001",
  name: "Test Product",
  categoryId: "550e8400-e29b-41d4-a716-446655440000",
  costPrice: 100,
  mrp: 150,
  variations: [{ stockQuantity: 10 }],
};

describe("CreateProductSchema", () => {
  it("accepts valid product with minimal required fields", () => {
    const result = CreateProductSchema.parse(minimalValidProduct);
    expect(result.imsCode).toBe("IMS-001");
    expect(result.name).toBe("Test Product");
    expect(result.categoryId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.costPrice).toBe(100);
    expect(result.mrp).toBe(150);
    expect(result.variations).toHaveLength(1);
    expect(result.variations[0].stockQuantity).toBe(10);
  });

  it("accepts product with optional fields", () => {
    const result = CreateProductSchema.parse({
      ...minimalValidProduct,
      description: "A product",
      subCategory: "Sub",
      length: 10,
      breadth: 5,
      height: 3,
      weight: 2,
      vendorId: "550e8400-e29b-41d4-a716-446655440001",
      defaultLocationId: "550e8400-e29b-41d4-a716-446655440002",
      attributeTypeIds: ["550e8400-e29b-41d4-a716-446655440003"],
      discounts: [
        {
          discountTypeId: "550e8400-e29b-41d4-a716-446655440004",
          discountPercentage: 10,
        },
      ],
    });
    expect(result.description).toBe("A product");
    expect(result.vendorId).toBe("550e8400-e29b-41d4-a716-446655440001");
    expect(result.discounts).toHaveLength(1);
  });

  it("accepts discount with empty string discountPercentage (coerced to 0)", () => {
    const result = CreateProductSchema.parse({
      ...minimalValidProduct,
      discounts: [
        {
          discountTypeId: "550e8400-e29b-41d4-a716-446655440004",
          discountPercentage: "",
        },
      ],
    });
    expect(result.discounts).toHaveLength(1);
    expect(result.discounts![0].discountPercentage).toBe(0);
  });

  it("rejects discount with discountPercentage > 100", () => {
    expect(() =>
      CreateProductSchema.parse({
        ...minimalValidProduct,
        discounts: [
          {
            discountTypeId: "550e8400-e29b-41d4-a716-446655440004",
            discountPercentage: 150,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects missing name", () => {
    expect(() =>
      CreateProductSchema.parse({
        ...minimalValidProduct,
        name: undefined,
      }),
    ).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      CreateProductSchema.parse({
        ...minimalValidProduct,
        name: "",
      }),
    ).toThrow();
  });

  it("rejects invalid categoryId (not UUID)", () => {
    expect(() =>
      CreateProductSchema.parse({
        ...minimalValidProduct,
        categoryId: "not-a-uuid",
      }),
    ).toThrow();
  });

  it("rejects empty variations", () => {
    expect(() =>
      CreateProductSchema.parse({
        ...minimalValidProduct,
        variations: [],
      }),
    ).toThrow();
  });

  it("accepts product without imsCode (optional)", () => {
    const { imsCode: _omit, ...withoutIms } = minimalValidProduct;
    const result = CreateProductSchema.parse(withoutIms);
    expect(result.imsCode).toBeUndefined();
  });

  it("trims product imsCode", () => {
    const result = CreateProductSchema.parse({
      ...minimalValidProduct,
      imsCode: "  IMS-001  ",
    });
    expect(result.imsCode).toBe("IMS-001");
  });
});

describe("UpdateProductSchema", () => {
  it("accepts empty object (no-op update)", () => {
    const result = UpdateProductSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts partial update with only name", () => {
    const result = UpdateProductSchema.parse({ name: "Updated Name" });
    expect(result.name).toBe("Updated Name");
  });

  it("accepts partial update with variations", () => {
    const result = UpdateProductSchema.parse({
      variations: [{ stockQuantity: 5 }],
    });
    expect(result.variations).toHaveLength(1);
    expect(result.variations![0].stockQuantity).toBe(5);
  });

  it("rejects empty string name", () => {
    expect(() => UpdateProductSchema.parse({ name: "" })).toThrow();
  });
});

describe("CreateDiscountTypeSchema", () => {
  it("accepts valid name only", () => {
    const result = CreateDiscountTypeSchema.parse({ name: "Normal" });
    expect(result.name).toBe("Normal");
  });

  it("accepts name with description and defaultPercentage", () => {
    const result = CreateDiscountTypeSchema.parse({
      name: "Premium",
      description: "Premium discount",
      defaultPercentage: 15,
    });
    expect(result.name).toBe("Premium");
    expect(result.description).toBe("Premium discount");
    expect(result.defaultPercentage).toBe(15);
  });

  it("rejects missing name", () => {
    expect(() => CreateDiscountTypeSchema.parse({})).toThrow();
  });

  it("rejects empty name", () => {
    expect(() => CreateDiscountTypeSchema.parse({ name: "" })).toThrow();
  });
});

describe("UpdateDiscountTypeSchema", () => {
  it("accepts empty object", () => {
    const result = UpdateDiscountTypeSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts partial update", () => {
    const result = UpdateDiscountTypeSchema.parse({ name: "New Name" });
    expect(result.name).toBe("New Name");
  });

  it("rejects empty string name", () => {
    expect(() => UpdateDiscountTypeSchema.parse({ name: "" })).toThrow();
  });
});

describe("GetAllProductsQuerySchema", () => {
  it("accepts empty query with defaults", () => {
    const result = GetAllProductsQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.sortBy).toBe("dateCreated");
    expect(result.sortOrder).toBe("asc");
    expect(result.search).toBe("");
  });

  it("accepts valid pagination and filters", () => {
    const result = GetAllProductsQuerySchema.parse({
      page: "2",
      limit: "25",
      sortBy: "name",
      sortOrder: "desc",
      search: "shoes",
      categoryId: "550e8400-e29b-41d4-a716-446655440000",
      lowStock: "true",
    });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(25);
    expect(result.sortBy).toBe("name");
    expect(result.sortOrder).toBe("desc");
    expect(result.search).toBe("shoes");
    expect(result.categoryId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.lowStock).toBe(true);
  });

  it("rejects invalid categoryId UUID", () => {
    expect(() =>
      GetAllProductsQuerySchema.parse({ categoryId: "not-a-uuid" }),
    ).toThrow();
  });

  it("transforms lowStock string to boolean", () => {
    expect(GetAllProductsQuerySchema.parse({ lowStock: "1" }).lowStock).toBe(
      true,
    );
    expect(GetAllProductsQuerySchema.parse({ lowStock: "true" }).lowStock).toBe(
      true,
    );
    expect(GetAllProductsQuerySchema.parse({ lowStock: "0" }).lowStock).toBe(
      false,
    );
  });
});

describe("DownloadProductsQuerySchema", () => {
  it("defaults format to excel", () => {
    const result = DownloadProductsQuerySchema.parse({});
    expect(result.format).toBe("excel");
  });

  it("accepts excel and csv format", () => {
    expect(DownloadProductsQuerySchema.parse({ format: "excel" }).format).toBe(
      "excel",
    );
    expect(DownloadProductsQuerySchema.parse({ format: "csv" }).format).toBe(
      "csv",
    );
    expect(DownloadProductsQuerySchema.parse({ format: "EXCEL" }).format).toBe(
      "excel",
    );
  });

  it("rejects invalid format", () => {
    expect(() =>
      DownloadProductsQuerySchema.parse({ format: "pdf" }),
    ).toThrow();
  });

  it("parses ids from comma-separated string", () => {
    const result = DownloadProductsQuerySchema.parse({
      ids: "id1, id2 , id3",
    });
    expect(result.ids).toEqual(["id1", "id2", "id3"]);
  });
});

describe("GetListQuerySchema", () => {
  it("accepts empty query with defaults", () => {
    const result = GetListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.sortBy).toBe("id");
    expect(result.sortOrder).toBe("asc");
  });

  it("accepts custom pagination", () => {
    const result = GetListQuerySchema.parse({
      page: "3",
      limit: "25",
      sortBy: "name",
      sortOrder: "desc",
      search: "  shoes  ",
    });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(25);
    expect(result.sortBy).toBe("name");
    expect(result.sortOrder).toBe("desc");
    expect(result.search).toBe("shoes");
  });
});

describe("GetProductDiscountsListQuerySchema", () => {
  it("extends GetListQuerySchema with filter params", () => {
    const result = GetProductDiscountsListQuerySchema.parse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
      categoryId: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.productId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.categoryId).toBe("550e8400-e29b-41d4-a716-446655440001");
  });
});

describe("excelProductRowSchema (bulk upload)", () => {
  it("accepts valid row with required fields", () => {
    const result = excelProductRowSchema.parse({
      imsCode: "IMS-001",
      location: "Warehouse A",
      category: "Electronics",
      name: "Product Name",
      costPrice: 100,
      finalSP: 150,
    });
    expect(result.imsCode).toBe("IMS-001");
    expect(result.location).toBe("Warehouse A");
    expect(result.category).toBe("Electronics");
    expect(result.name).toBe("Product Name");
    expect(result.costPrice).toBe(100);
    expect(result.finalSP).toBe(150);
    expect(result.quantity).toBe(0);
    expect(result.dynamicAttributes).toEqual({});
  });

  it("accepts dynamic attributes", () => {
    const result = excelProductRowSchema.parse({
      imsCode: "IMS-001",
      location: "A",
      category: "Cat",
      name: "Prod",
      costPrice: 10,
      finalSP: 20,
      dynamicAttributes: { Color: "Red", Size: "L" },
    });
    expect(result.dynamicAttributes).toEqual({ Color: "Red", Size: "L" });
  });

  it("treats empty product code as null (optional)", () => {
    const result = excelProductRowSchema.parse({
      imsCode: "",
      location: "A",
      category: "Cat",
      name: "Prod",
      costPrice: 10,
      finalSP: 20,
    });
    expect(result.imsCode).toBeNull();
  });

  it("coerces quantity to integer", () => {
    const result = excelProductRowSchema.parse({
      imsCode: "IMS-001",
      location: "A",
      category: "Cat",
      name: "Prod",
      quantity: "5.7",
      costPrice: 10,
      finalSP: 20,
    });
    expect(result.quantity).toBe(5);
  });
});

describe("CreateProductSchema — tagIds", () => {
  it("accepts an array of UUID tag ids", () => {
    const r = CreateProductSchema.safeParse({
      ...minimalValidProduct,
      tagIds: [
        "550e8400-e29b-41d4-a716-446655440000",
        "550e8400-e29b-41d4-a716-446655440001",
      ],
    });
    expect(r.success).toBe(true);
  });

  it("accepts omitted tagIds", () => {
    const r = CreateProductSchema.safeParse(minimalValidProduct);
    expect(r.success).toBe(true);
  });

  it("rejects non-UUID tag ids", () => {
    const r = CreateProductSchema.safeParse({
      ...minimalValidProduct,
      tagIds: ["not-a-uuid"],
    });
    expect(r.success).toBe(false);
  });
});

describe("UpdateProductSchema — tagIds", () => {
  it("accepts empty tagIds array (clears all)", () => {
    const r = UpdateProductSchema.safeParse({ tagIds: [] });
    expect(r.success).toBe(true);
  });

  it("rejects non-UUID tag ids", () => {
    const r = UpdateProductSchema.safeParse({ tagIds: ["nope"] });
    expect(r.success).toBe(false);
  });
});

describe("CreateProductTagSchema", () => {
  it("accepts a valid name", () => {
    expect(CreateProductTagSchema.safeParse({ name: "Sale" }).success).toBe(
      true,
    );
  });

  it("trims whitespace", () => {
    const r = CreateProductTagSchema.parse({ name: "  Sale  " });
    expect(r.name).toBe("Sale");
  });

  it("rejects empty after trim", () => {
    expect(CreateProductTagSchema.safeParse({ name: "   " }).success).toBe(
      false,
    );
  });

  it("rejects names longer than 100 chars", () => {
    expect(
      CreateProductTagSchema.safeParse({ name: "a".repeat(101) }).success,
    ).toBe(false);
  });
});

describe("UpdateProductTagSchema", () => {
  it("accepts a valid name", () => {
    expect(UpdateProductTagSchema.safeParse({ name: "Renamed" }).success).toBe(
      true,
    );
  });

  it("rejects missing name", () => {
    expect(UpdateProductTagSchema.safeParse({}).success).toBe(false);
  });
});

describe("ListProductTagsQuerySchema", () => {
  it("accepts page + limit + search", () => {
    const r = ListProductTagsQuerySchema.parse({
      page: "2",
      limit: "10",
      search: "  pro  ",
    });
    expect(r.page).toBe(2);
    expect(r.limit).toBe(10);
    expect(r.search).toBe("pro");
  });

  it("accepts an empty query (all undefined)", () => {
    const r = ListProductTagsQuerySchema.parse({});
    expect(r.page).toBeUndefined();
    expect(r.limit).toBeUndefined();
    expect(r.search).toBeUndefined();
  });

  it("rejects limit > 100", () => {
    expect(ListProductTagsQuerySchema.safeParse({ limit: "999" }).success).toBe(
      false,
    );
  });
});
