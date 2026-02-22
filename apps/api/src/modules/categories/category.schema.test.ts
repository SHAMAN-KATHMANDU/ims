import { describe, it, expect } from "vitest";
import {
  categoryIdParamsSchema,
  categoryListQuerySchema,
  categorySubcategorySchema,
  createCategorySchema,
  updateCategorySchema,
} from "./category.schema";

describe("category schemas", () => {
  it("validates createCategorySchema and trims values", () => {
    const parsed = createCategorySchema.parse({
      name: "  Home Decor ",
      description: "  Home decoration items ",
    });

    expect(parsed.name).toBe("Home Decor");
    expect(parsed.description).toBe("Home decoration items");
  });

  it("rejects empty category name", () => {
    const result = createCategorySchema.safeParse({
      name: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("validates updateCategorySchema partial payload", () => {
    const parsed = updateCategorySchema.parse({
      name: "  Lifestyle ",
      description: null,
    });

    expect(parsed.name).toBe("Lifestyle");
    expect(parsed.description).toBeNull();
  });

  it("validates categorySubcategorySchema and trims name", () => {
    const parsed = categorySubcategorySchema.parse({
      name: "  Lamps ",
    });

    expect(parsed.name).toBe("Lamps");
  });

  it("validates categoryIdParamsSchema", () => {
    const parsed = categoryIdParamsSchema.parse({ id: "cat-1" });
    expect(parsed.id).toBe("cat-1");
  });

  it("validates categoryListQuerySchema", () => {
    const parsed = categoryListQuerySchema.parse({
      page: "1",
      limit: "30",
      search: "  home ",
      sortBy: "name",
      sortOrder: "asc",
    });

    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(30);
    expect(parsed.search).toBe("home");
    expect(parsed.sortBy).toBe("name");
    expect(parsed.sortOrder).toBe("asc");
  });
});
