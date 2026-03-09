import { describe, it, expect } from "vitest";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CreateSubcategorySchema,
  DeleteSubcategorySchema,
} from "./category.schema";

describe("CreateCategorySchema", () => {
  it("accepts valid name and description", () => {
    const result = CreateCategorySchema.parse({
      name: "Electronics",
      description: "All electronics",
    });
    expect(result).toEqual({
      name: "Electronics",
      description: "All electronics",
    });
  });

  it("accepts name without description", () => {
    const result = CreateCategorySchema.parse({ name: "Electronics" });
    expect(result.name).toBe("Electronics");
    expect(result.description).toBeUndefined();
  });

  it("rejects empty name", () => {
    expect(() => CreateCategorySchema.parse({ name: "" })).toThrow();
  });

  it("rejects missing name", () => {
    expect(() => CreateCategorySchema.parse({})).toThrow();
  });

  it("rejects name exceeding 100 characters", () => {
    expect(() =>
      CreateCategorySchema.parse({ name: "a".repeat(101) }),
    ).toThrow();
  });

  it("rejects description exceeding 500 characters", () => {
    expect(() =>
      CreateCategorySchema.parse({
        name: "Valid",
        description: "x".repeat(501),
      }),
    ).toThrow();
  });
});

describe("UpdateCategorySchema", () => {
  it("accepts partial update with only name", () => {
    const result = UpdateCategorySchema.parse({ name: "New Name" });
    expect(result.name).toBe("New Name");
  });

  it("accepts partial update with only description", () => {
    const result = UpdateCategorySchema.parse({ description: "Updated desc" });
    expect(result.description).toBe("Updated desc");
  });

  it("accepts null description to clear it", () => {
    const result = UpdateCategorySchema.parse({ description: null });
    expect(result.description).toBeNull();
  });

  it("accepts empty object (no-op update)", () => {
    const result = UpdateCategorySchema.parse({});
    expect(result).toEqual({});
  });

  it("rejects empty string name", () => {
    expect(() => UpdateCategorySchema.parse({ name: "" })).toThrow();
  });
});

describe("CreateSubcategorySchema", () => {
  it("accepts valid name", () => {
    const result = CreateSubcategorySchema.parse({ name: "Laptops" });
    expect(result.name).toBe("Laptops");
  });

  it("rejects empty name", () => {
    expect(() => CreateSubcategorySchema.parse({ name: "" })).toThrow();
  });

  it("rejects missing name", () => {
    expect(() => CreateSubcategorySchema.parse({})).toThrow();
  });
});

describe("DeleteSubcategorySchema", () => {
  it("accepts valid name", () => {
    const result = DeleteSubcategorySchema.parse({ name: "Laptops" });
    expect(result.name).toBe("Laptops");
  });

  it("rejects empty name", () => {
    expect(() => DeleteSubcategorySchema.parse({ name: "" })).toThrow();
  });
});
