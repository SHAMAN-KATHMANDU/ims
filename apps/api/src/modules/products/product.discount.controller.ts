/**
 * Product controller: categories, discount types, product discounts.
 */

import { Request, Response } from "express";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { ok, okPaginated, fail } from "@/shared/response";
import {
  getAllCategories as getAllCategoriesService,
  getAllDiscountTypes as getAllDiscountTypesService,
  getProductDiscounts as getProductDiscountsService,
  getAllProductDiscounts as getAllProductDiscountsService,
} from "./products.service";

export async function getAllCategories(req: Request, res: Response) {
  const auth = req.authContext!;

  const query = getValidatedQuery<{
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }>(req, res);
  const { page, limit, sortBy, sortOrder } = getPaginationParams(query);

  const { categories, totalItems } = await getAllCategoriesService({
    tenantId: auth.tenantId,
    page,
    limit,
    sortBy: sortBy ?? "name",
    sortOrder: (sortOrder as "asc" | "desc") ?? "asc",
  });

  const result = createPaginationResult(categories, totalItems, page, limit);
  return okPaginated(
    res,
    result.data,
    result.pagination,
    "Categories fetched successfully",
  );
}

export async function getAllDiscountTypes(req: Request, res: Response) {
  const auth = req.authContext!;

  const query = getValidatedQuery<{
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }>(req, res);
  const { page, limit, sortBy, sortOrder } = getPaginationParams(query);

  const { discountTypes, totalItems } = await getAllDiscountTypesService({
    tenantId: auth.tenantId,
    page,
    limit,
    sortBy: sortBy ?? "name",
    sortOrder: (sortOrder as "asc" | "desc") ?? "asc",
  });

  const result = createPaginationResult(discountTypes, totalItems, page, limit);
  return okPaginated(
    res,
    result.data,
    result.pagination,
    "Discount types fetched successfully",
  );
}

export async function getAllProductDiscounts(req: Request, res: Response) {
  const auth = req.authContext!;

  const query = getValidatedQuery<{
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
    productId?: string;
    categoryId?: string;
    subCategoryId?: string;
    discountTypeId?: string;
  }>(req, res);
  const { page, limit, sortBy, sortOrder, search } = getPaginationParams(query);
  const { productId, categoryId, subCategoryId, discountTypeId } = query;

  const { discounts, totalItems } = await getAllProductDiscountsService({
    tenantId: auth.tenantId,
    page,
    limit,
    sortBy,
    sortOrder,
    search,
    productId,
    categoryId,
    subCategoryId,
    discountTypeId,
  });

  const result = createPaginationResult(discounts, totalItems, page, limit);
  return okPaginated(
    res,
    result.data,
    result.pagination,
    "Product discounts fetched successfully",
  );
}

export async function getProductDiscounts(req: Request, res: Response) {
  const auth = req.authContext!;
  const { id } = req.params as { id: string };

  const discounts = await getProductDiscountsService(auth.tenantId, id);
  return ok(res, { discounts }, 200, "Product discounts fetched successfully");
}
