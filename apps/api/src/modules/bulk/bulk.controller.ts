import { Request, Response } from "express";
import { fail } from "@/shared/response";
import productController from "@/modules/products/product.controller";
import memberController from "@/modules/members/member.controller";
import saleController from "@/modules/sales/sale.controller";
import { getValidatedQuery } from "@/middlewares/validateRequest";

const BULK_TYPES = ["products", "members", "sales"] as const;
export type BulkType = (typeof BULK_TYPES)[number];

/**
 * Common bulk upload: delegates to product/member/sale controller by type.
 * Type from path param (:type) or query or body; file from multipart.
 */
export async function bulkUpload(req: Request, res: Response): Promise<void> {
  const auth = req.authContext!;
  const { type } = req.params as { type: BulkType };
  if (!req.file) {
    fail(res, "No file uploaded", 400);
    return;
  }

  switch (type) {
    case "products":
      await productController.bulkUploadProducts(req, res);
      return;
    case "members":
      await memberController.bulkUploadMembers(req, res);
      return;
    case "sales":
      await saleController.bulkUploadSales(req, res);
      return;
    default:
      fail(res, "Invalid type", 400);
      return;
  }
}

/**
 * Common template download: delegates by type (products|members|sales).
 */
export async function downloadTemplate(
  req: Request,
  res: Response,
): Promise<void> {
  const auth = req.authContext!;
  const { type } = getValidatedQuery<{ type: BulkType }>(req, res);

  switch (type) {
    case "products":
      await productController.downloadBulkUploadTemplate(req, res);
      return;
    case "members":
      await memberController.downloadBulkUploadTemplate(req, res);
      return;
    case "sales":
      await saleController.downloadBulkUploadTemplate(req, res);
      return;
    default:
      fail(res, "Invalid type", 400);
      return;
  }
}

/**
 * Common data download (Excel/CSV): delegates by type. Query: type, format, ids.
 */
export async function download(req: Request, res: Response): Promise<void> {
  const auth = req.authContext!;
  const { type } = getValidatedQuery<{ type: BulkType }>(req, res);

  switch (type) {
    case "products":
      await productController.downloadProducts(req, res);
      return;
    case "members":
      await memberController.downloadMembers(req, res);
      return;
    case "sales":
      await saleController.downloadSales(req, res);
      return;
    default:
      fail(res, "Invalid type", 400);
      return;
  }
}
