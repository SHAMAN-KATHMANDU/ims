import { Request, Response } from "express";
import productController from "@/modules/products/product.controller";
import memberController from "@/modules/members/member.controller";
import saleController from "@/modules/sales/sale.controller";

const BULK_TYPES = ["products", "members", "sales"] as const;
export type BulkType = (typeof BULK_TYPES)[number];

/**
 * Common bulk upload: delegates to product/member/sale controller by type.
 * Type from path param (:type) or query or body; file from multipart.
 */
export async function bulkUpload(req: Request, res: Response): Promise<void> {
  const { type } = req.params as { type: BulkType };
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded" });
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
      res.status(400).json({ message: "Invalid type" });
  }
}

/**
 * Common template download: delegates by type (products|members|sales).
 */
export async function downloadTemplate(
  req: Request,
  res: Response,
): Promise<void> {
  const { type } = req.query as { type: BulkType };

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
      res.status(400).json({ message: "Invalid type" });
  }
}

/**
 * Common data download (Excel/CSV): delegates by type. Query: type, format, ids.
 */
export async function download(req: Request, res: Response): Promise<void> {
  const { type } = req.query as { type: BulkType };

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
      res.status(400).json({ message: "Invalid type" });
  }
}
