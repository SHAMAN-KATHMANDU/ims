import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryService } from "./category.service";
import type { CategoryRepository } from "./category.repository";
import { createError } from "@/middlewares/errorHandler";

const mockFindByName = vi.fn();
const mockFindByNameExcluding = vi.fn();
const mockCreate = vi.fn();
const mockFindAll = vi.fn();
const mockFindById = vi.fn();
const mockFindByIdWithProductCount = vi.fn();
const mockFindSubcategories = vi.fn();
const mockFindSubcategoryByName = vi.fn();
const mockUpdate = vi.fn();
const mockSoftDelete = vi.fn();
const mockCreateSubcategory = vi.fn();
const mockCountLinkedProducts = vi.fn();
const mockSoftDeleteSubcategory = vi.fn();

const mockRepo: CategoryRepository = {
  findByName: mockFindByName,
  findByNameExcluding: mockFindByNameExcluding,
  create: mockCreate,
  findAll: mockFindAll,
  findById: mockFindById,
  findByIdWithProductCount: mockFindByIdWithProductCount,
  findSubcategories: mockFindSubcategories,
  findSubcategoryByName: mockFindSubcategoryByName,
  update: mockUpdate,
  softDelete: mockSoftDelete,
  createSubcategory: mockCreateSubcategory,
  countLinkedProducts: mockCountLinkedProducts,
  softDeleteSubcategory: mockSoftDeleteSubcategory,
} as unknown as CategoryRepository;

vi.mock("@/shared/audit/createDeleteAuditLog", () => ({
  createDeleteAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const categoryService = new CategoryService(mockRepo);

describe("CategoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates category when name is available", async () => {
      mockFindByName.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: "c1",
        name: "Electronics",
        tenantId: "t1",
      });

      const result = await categoryService.create("t1", {
        name: "Electronics",
      });

      expect(result.name).toBe("Electronics");
      expect(mockCreate).toHaveBeenCalledWith("t1", { name: "Electronics" });
    });

    it("throws 409 when category name already exists", async () => {
      mockFindByName.mockResolvedValue({
        id: "c0",
        name: "Electronics",
      });

      await expect(
        categoryService.create("t1", { name: "Electronics" }),
      ).rejects.toMatchObject(
        createError("Category with this name already exists", 409),
      );

      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("returns category when found", async () => {
      const category = { id: "c1", name: "Electronics", tenantId: "t1" };
      mockFindById.mockResolvedValue(category);

      const result = await categoryService.findById("c1", "t1");
      expect(result).toEqual(category);
    });

    it("throws 404 when category not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        categoryService.findById("missing", "t1"),
      ).rejects.toMatchObject(createError("Category not found", 404));
    });
  });

  describe("delete", () => {
    it("throws 400 when category has products", async () => {
      mockFindByIdWithProductCount.mockResolvedValue({
        id: "c1",
        name: "Electronics",
        _count: { products: 3 },
      });

      await expect(
        categoryService.delete("c1", "t1", { userId: "u1" }),
      ).rejects.toMatchObject(
        createError("Cannot delete category with existing products", 400),
      );

      expect(mockSoftDelete).not.toHaveBeenCalled();
    });
  });

  describe("getSubcategories", () => {
    it("returns subcategory names", async () => {
      mockFindSubcategories.mockResolvedValue([
        { name: "Phones" },
        { name: "Laptops" },
      ]);

      const result = await categoryService.getSubcategories("c1");
      expect(result).toEqual(["Phones", "Laptops"]);
    });
  });
});
