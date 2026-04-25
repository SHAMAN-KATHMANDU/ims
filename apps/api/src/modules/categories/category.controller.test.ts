import { describe, it, expect, vi, beforeEach } from "vitest";
import { Response } from "express";

vi.mock("./category.service", () => ({
  CategoryService: vi.fn(),
  default: {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getSubcategories: vi.fn(),
    createSubcategory: vi.fn(),
    deleteSubcategory: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({ default: {} }));

import categoryController from "./category.controller";
import * as categoryServiceModule from "./category.service";
import { sendControllerError } from "@/utils/controllerError";
import { mockRes, makeReq } from "@tests/helpers/controller";

const mockService = categoryServiceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function makeAppError(
  message: string,
  statusCode: number,
  extra?: Record<string, unknown>,
) {
  const err = new Error(message) as any;
  err.statusCode = statusCode;
  if (extra) Object.assign(err, extra);
  return err;
}

describe("CategoryController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── createCategory ───────────────────────────────────────────────────────

  describe("createCategory", () => {
    it("returns 201 with created category on success", async () => {
      const category = { id: "c1", name: "Electronics" };
      mockService.create.mockResolvedValue({ category, restored: false });
      const req = makeReq({ body: { name: "Electronics" } });
      const res = mockRes() as Response;

      await categoryController.createCategory(req, res);

      expect(mockService.create).toHaveBeenCalledWith("t1", {
        name: "Electronics",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Category created successfully",
        category,
      });
    });

    it("returns 201 with restored message when soft-deleted category exists", async () => {
      const category = { id: "c1", name: "Electronics" };
      mockService.create.mockResolvedValue({ category, restored: true });
      const req = makeReq({ body: { name: "Electronics" } });
      const res = mockRes() as Response;

      await categoryController.createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Category restored successfully",
        category,
        restored: true,
      });
    });

    it("returns 400 when name is missing (Zod validation)", async () => {
      const req = makeReq({ body: {} });
      const res = mockRes() as Response;

      await categoryController.createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it("returns 409 when category name already exists", async () => {
      mockService.create.mockRejectedValue(
        makeAppError("Category with this name already exists", 409, {
          existingCategory: { id: "c1", name: "Electronics" },
        }),
      );
      const req = makeReq({ body: { name: "Electronics" } });
      const res = mockRes() as Response;

      await categoryController.createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.create.mockRejectedValue(new Error("DB down"));
      const req = makeReq({ body: { name: "Electronics" } });
      const res = mockRes() as Response;

      await categoryController.createCategory(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // ─── getAllCategories ──────────────────────────────────────────────────────

  describe("getAllCategories", () => {
    it("returns 200 with paginated categories", async () => {
      const result = { data: [], pagination: {} };
      mockService.findAll.mockResolvedValue(result);
      const req = makeReq({ query: { page: "1", limit: "10" } });
      const res = mockRes() as Response;

      await categoryController.getAllCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: [], pagination: {} }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.findAll.mockRejectedValue(new Error("DB error"));
      const req = makeReq();
      const res = mockRes() as Response;

      await categoryController.getAllCategories(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // ─── getCategoryById ──────────────────────────────────────────────────────

  describe("getCategoryById", () => {
    it("returns 200 with category on success", async () => {
      const category = { id: "c1", name: "Electronics" };
      mockService.findById.mockResolvedValue(category);
      const req = makeReq({ params: { id: "c1" } });
      const res = mockRes() as Response;

      await categoryController.getCategoryById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ category }),
      );
    });

    it("returns 404 when category not found", async () => {
      mockService.findById.mockRejectedValue(
        makeAppError("Category not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await categoryController.getCategoryById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.findById.mockRejectedValue(new Error("DB error"));
      const req = makeReq({ params: { id: "c1" } });
      const res = mockRes() as Response;

      await categoryController.getCategoryById(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // ─── updateCategory ───────────────────────────────────────────────────────

  describe("updateCategory", () => {
    it("returns 200 with updated category on success", async () => {
      const category = { id: "c1", name: "Updated" };
      mockService.update.mockResolvedValue(category);
      const req = makeReq({ params: { id: "c1" }, body: { name: "Updated" } });
      const res = mockRes() as Response;

      await categoryController.updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ category }),
      );
    });

    it("returns 400 on Zod validation error (empty name)", async () => {
      const req = makeReq({ params: { id: "c1" }, body: { name: "" } });
      const res = mockRes() as Response;

      await categoryController.updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it("returns 404 when category not found", async () => {
      mockService.update.mockRejectedValue(
        makeAppError("Category not found", 404),
      );
      const req = makeReq({ params: { id: "missing" }, body: { name: "X" } });
      const res = mockRes() as Response;

      await categoryController.updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 409 on name conflict", async () => {
      mockService.update.mockRejectedValue(
        makeAppError("Category with this name already exists", 409),
      );
      const req = makeReq({ params: { id: "c1" }, body: { name: "Taken" } });
      const res = mockRes() as Response;

      await categoryController.updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.update.mockRejectedValue(new Error("DB error"));
      const req = makeReq({ params: { id: "c1" }, body: { name: "X" } });
      const res = mockRes() as Response;

      await categoryController.updateCategory(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // ─── deleteCategory ───────────────────────────────────────────────────────

  describe("deleteCategory", () => {
    it("returns 200 on successful deletion", async () => {
      mockService.delete.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: "c1" } });
      const res = mockRes() as Response;

      await categoryController.deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when category not found", async () => {
      mockService.delete.mockRejectedValue(
        makeAppError("Category not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await categoryController.deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when category has products", async () => {
      mockService.delete.mockRejectedValue(
        makeAppError("Cannot delete category with existing products", 400, {
          productCount: 5,
        }),
      );
      const req = makeReq({ params: { id: "c1" } });
      const res = mockRes() as Response;

      await categoryController.deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.delete.mockRejectedValue(new Error("DB error"));
      const req = makeReq({ params: { id: "c1" } });
      const res = mockRes() as Response;

      await categoryController.deleteCategory(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // ─── getCategorySubcategories ─────────────────────────────────────────────

  describe("getCategorySubcategories", () => {
    it("returns 200 with subcategory names", async () => {
      mockService.getSubcategories.mockResolvedValue(["Laptops", "Phones"]);
      const req = makeReq({ params: { id: "c1" } });
      const res = mockRes() as Response;

      await categoryController.getCategorySubcategories(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          subcategories: ["Laptops", "Phones"],
          categoryId: "c1",
        }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.getSubcategories.mockRejectedValue(new Error("DB error"));
      const req = makeReq({ params: { id: "c1" } });
      const res = mockRes() as Response;

      await categoryController.getCategorySubcategories(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // ─── createSubcategory ────────────────────────────────────────────────────

  describe("createSubcategory", () => {
    it("returns 201 with created subcategory", async () => {
      const subCategory = { id: "sc1", name: "Laptops", categoryId: "c1" };
      mockService.createSubcategory.mockResolvedValue(subCategory);
      const req = makeReq({ params: { id: "c1" }, body: { name: "Laptops" } });
      const res = mockRes() as Response;

      await categoryController.createSubcategory(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ subCategory }),
      );
    });

    it("returns 400 on Zod validation error (empty name)", async () => {
      const req = makeReq({ params: { id: "c1" }, body: { name: "" } });
      const res = mockRes() as Response;

      await categoryController.createSubcategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.createSubcategory).not.toHaveBeenCalled();
    });

    it("returns 404 when category not found", async () => {
      mockService.createSubcategory.mockRejectedValue(
        makeAppError("Category not found", 404),
      );
      const req = makeReq({
        params: { id: "missing" },
        body: { name: "Laptops" },
      });
      const res = mockRes() as Response;

      await categoryController.createSubcategory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 409 when subcategory already exists", async () => {
      mockService.createSubcategory.mockRejectedValue(
        makeAppError(
          "Subcategory with this name already exists for this category",
          409,
        ),
      );
      const req = makeReq({ params: { id: "c1" }, body: { name: "Laptops" } });
      const res = mockRes() as Response;

      await categoryController.createSubcategory(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.createSubcategory.mockRejectedValue(new Error("DB error"));
      const req = makeReq({ params: { id: "c1" }, body: { name: "Laptops" } });
      const res = mockRes() as Response;

      await categoryController.createSubcategory(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // ─── deleteSubcategory ────────────────────────────────────────────────────

  describe("deleteSubcategory", () => {
    it("returns 200 on successful deletion", async () => {
      mockService.deleteSubcategory.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: "c1" }, body: { name: "Laptops" } });
      const res = mockRes() as Response;

      await categoryController.deleteSubcategory(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 400 on Zod validation error (empty name)", async () => {
      const req = makeReq({ params: { id: "c1" }, body: { name: "" } });
      const res = mockRes() as Response;

      await categoryController.deleteSubcategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.deleteSubcategory).not.toHaveBeenCalled();
    });

    it("returns 404 when subcategory not found", async () => {
      mockService.deleteSubcategory.mockRejectedValue(
        makeAppError("Subcategory not found for this category", 404),
      );
      const req = makeReq({ params: { id: "c1" }, body: { name: "Missing" } });
      const res = mockRes() as Response;

      await categoryController.deleteSubcategory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when subcategory has linked products", async () => {
      mockService.deleteSubcategory.mockRejectedValue(
        makeAppError(
          "Cannot delete subcategory that is linked to existing products",
          400,
        ),
      );
      const req = makeReq({ params: { id: "c1" }, body: { name: "Laptops" } });
      const res = mockRes() as Response;

      await categoryController.deleteSubcategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.deleteSubcategory.mockRejectedValue(new Error("DB error"));
      const req = makeReq({ params: { id: "c1" }, body: { name: "Laptops" } });
      const res = mockRes() as Response;

      await categoryController.deleteSubcategory(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
