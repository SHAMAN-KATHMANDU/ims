import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CreateSubcategorySchema,
  DeleteSubcategorySchema,
} from "./category.schema";
import categoryService, { CategoryService } from "./category.service";

class CategoryController {
  constructor(private service: CategoryService) {}

  async createCategory(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const body = CreateCategorySchema.parse(req.body);
      const category = await this.service.create(tenantId, body);
      return res
        .status(201)
        .json({ message: "Category created successfully", category });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode === 409) {
        return res.status(409).json({
          message: (error as AppError).message,
          existingCategory: (error as any).existingCategory,
        });
      }
      return sendControllerError(req, res, error, "Create category error");
    }
  }

  async getAllCategories(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const result = await this.service.findAll(tenantId, req.query);
      return res
        .status(200)
        .json({ message: "Categories fetched successfully", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get all categories error");
    }
  }

  async getCategoryById(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const tenantId = req.user!.tenantId;
      const category = await this.service.findById(id, tenantId);
      return res
        .status(200)
        .json({ message: "Category fetched successfully", category });
    } catch (error: unknown) {
      if ((error as AppError).statusCode === 404) {
        return res.status(404).json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Get category by ID error");
    }
  }

  async updateCategory(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const tenantId = req.user!.tenantId;
      const body = UpdateCategorySchema.parse(req.body);
      const category = await this.service.update(id, tenantId, body);
      return res
        .status(200)
        .json({ message: "Category updated successfully", category });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      if (appErr.statusCode === 409) {
        return res.status(409).json({
          message: appErr.message,
          existingCategory: (error as any).existingCategory,
        });
      }
      return sendControllerError(req, res, error, "Update category error");
    }
  }

  async deleteCategory(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const tenantId = req.user!.tenantId;
      await this.service.delete(id, tenantId);
      return res.status(200).json({ message: "Category deleted successfully" });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      if (appErr.statusCode === 400) {
        return res.status(400).json({
          message: appErr.message,
          productCount: (error as any).productCount,
          hint: "Please remove or reassign all products in this category before deleting",
        });
      }
      return sendControllerError(req, res, error, "Delete category error");
    }
  }

  async getCategorySubcategories(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const subcategories = await this.service.getSubcategories(id);
      return res.status(200).json({
        message: "Subcategories fetched successfully",
        categoryId: id,
        subcategories,
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get category subcategories error",
      );
    }
  }

  async createSubcategory(req: Request, res: Response) {
    try {
      const categoryId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const tenantId = req.user!.tenantId;
      const body = CreateSubcategorySchema.parse(req.body);
      const subCategory = await this.service.createSubcategory(
        categoryId,
        tenantId,
        body,
      );
      return res
        .status(201)
        .json({ message: "Subcategory created successfully", subCategory });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      if (appErr.statusCode === 409) {
        return res.status(409).json({
          message: appErr.message,
          subCategory: (error as any).subCategory,
        });
      }
      return sendControllerError(req, res, error, "Create subcategory error");
    }
  }

  async deleteSubcategory(req: Request, res: Response) {
    try {
      const categoryId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const body = DeleteSubcategorySchema.parse(req.body);
      await this.service.deleteSubcategory(categoryId, body);
      return res
        .status(200)
        .json({ message: "Subcategory deleted successfully" });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      if (appErr.statusCode === 400) {
        return res.status(400).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Delete subcategory error");
    }
  }
}

export default new CategoryController(categoryService);
