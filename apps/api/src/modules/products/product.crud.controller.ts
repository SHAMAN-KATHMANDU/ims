/**
 * Product controller: create, list, get by id, delete.
 */

import { Request, Response } from "express";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { ok, okPaginated, fail } from "@/shared/response";
import {
  getAllProducts as getAllProductsService,
  getProductById as getProductByIdService,
  createProduct as createProductService,
  deleteProduct as deleteProductService,
  type CreateProductPayload,
} from "./products.service";

export async function createProduct(req: Request, res: Response) {
  const auth = req.authContext!;

  const payload = req.body as CreateProductPayload;
  const product = await createProductService(payload, auth, {
    ip:
      (req as { ip?: string }).ip ??
      (req.socket as { remoteAddress?: string })?.remoteAddress,
    userAgent: req.get("user-agent") ?? undefined,
  });
  return ok(res, { product }, 201, "Product created successfully");
}

export async function getAllProducts(req: Request, res: Response) {
  const auth = req.authContext!;

  const query = getValidatedQuery<{
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    locationId?: string;
    categoryId?: string;
    subCategoryId?: string;
    subCategory?: string;
    vendorId?: string;
    dateFrom?: string;
    dateTo?: string;
    lowStock?: boolean;
  }>(req, res);
  const { page, limit, sortBy, sortOrder, search } = getPaginationParams(query);

  const {
    locationId,
    categoryId,
    subCategoryId,
    subCategory,
    vendorId,
    dateFrom,
    dateTo,
    lowStock,
  } = query;

  const { products, totalItems } = await getAllProductsService({
    tenantId: auth.tenantId,
    page,
    limit,
    sortBy: sortBy ?? "dateCreated",
    sortOrder: (sortOrder as "asc" | "desc") ?? "desc",
    search,
    locationId,
    categoryId,
    subCategoryId,
    subCategory,
    vendorId,
    dateFrom,
    dateTo,
    lowStock,
  });

  const result = createPaginationResult(products, totalItems, page, limit);
  return okPaginated(
    res,
    result.data,
    result.pagination,
    "Products fetched successfully",
  );
}

export async function getProductById(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const product = await getProductByIdService(id);
  return ok(res, { product }, 200, "Product fetched successfully");
}

export async function deleteProduct(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  await deleteProductService(id);
  return ok(res, null, 200, "Product deleted successfully");
}
