import { Request, Response } from "express";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { ok, okPaginated, fail } from "@/shared/response";
import * as categoriesService from "./categories.service";

class CategoryController {
  async createCategory(req: Request, res: Response) {
    const auth = req.authContext!;
    const { name, description } = req.body;

    const result = await categoriesService.createCategory({
      tenantId: auth.tenantId,
      name,
      description,
    });

    if ("conflict" in result) {
      return fail(
        res,
        "Category with this name already exists",
        409,
        undefined,
        {
          existingCategory: result.existingCategory,
        },
      );
    }
    return ok(
      res,
      { category: result.category },
      201,
      "Category created successfully",
    );
  }

  async getAllCategories(req: Request, res: Response) {
    const auth = req.authContext!;

    const query = getValidatedQuery<{
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: "id" | "name" | "createdAt" | "updatedAt";
      sortOrder?: "asc" | "desc";
    }>(req, res);
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(query);

    const { categories, totalItems } = await categoriesService.getAllCategories(
      {
        tenantId: auth.tenantId,
        page,
        limit,
        sortBy,
        sortOrder,
        search,
      },
    );

    const result = createPaginationResult(categories, totalItems, page, limit);
    return okPaginated(
      res,
      result.data,
      result.pagination,
      "Categories fetched successfully",
    );
  }

  async getCategoryById(req: Request, res: Response) {
    const auth = req.authContext!;
    const { id } = req.params as { id: string };

    const category = await categoriesService.getCategoryById(auth.tenantId, id);
    return ok(res, { category }, 200, "Category fetched successfully");
  }

  async getCategorySubcategories(req: Request, res: Response) {
    const auth = req.authContext!;
    const { id } = req.params as { id: string };

    const { categoryId, subcategories } =
      await categoriesService.getCategorySubcategories(auth.tenantId, id);
    return ok(
      res,
      { categoryId, subcategories },
      200,
      "Subcategories fetched successfully",
    );
  }

  async createSubcategory(req: Request, res: Response) {
    const auth = req.authContext!;
    const { id: categoryId } = req.params as { id: string };
    const { name } = req.body as { name: string };

    const result = await categoriesService.createSubcategory(
      auth.tenantId,
      categoryId,
      name,
    );

    if ("conflict" in result) {
      return fail(
        res,
        "Subcategory with this name already exists for this category",
        409,
        undefined,
        { subCategory: result.subCategory },
      );
    }
    return ok(
      res,
      { subCategory: result.subCategory },
      201,
      "Subcategory created successfully",
    );
  }

  async deleteSubcategory(req: Request, res: Response) {
    const auth = req.authContext!;
    const { id: categoryId } = req.params as { id: string };
    const { name } = req.body as { name: string };

    const result = await categoriesService.deleteSubcategory(
      auth.tenantId,
      categoryId,
      name,
    );
    if ("blocked" in result) {
      return fail(res, result.message, 400);
    }
    return ok(res, {}, 200, "Subcategory deleted successfully");
  }

  async updateCategory(req: Request, res: Response) {
    const auth = req.authContext!;
    const { id } = req.params as { id: string };
    const { name, description } = req.body;

    const result = await categoriesService.updateCategory(auth.tenantId, id, {
      name,
      description,
    });

    if ("conflict" in result) {
      return fail(
        res,
        "Category with this name already exists",
        409,
        undefined,
        {
          existingCategory: result.existingCategory,
        },
      );
    }
    return ok(
      res,
      { category: result.category },
      200,
      "Category updated successfully",
    );
  }

  async deleteCategory(req: Request, res: Response) {
    const auth = req.authContext!;
    const { id } = req.params as { id: string };

    const result = await categoriesService.deleteCategory(auth.tenantId, id);
    if ("blocked" in result) {
      return fail(
        res,
        "Cannot delete category with existing products",
        400,
        undefined,
        {
          productCount: result.productCount,
          hint: result.hint,
        },
      );
    }
    return ok(res, {}, 200, "Category deleted successfully");
  }
}

export default new CategoryController();
