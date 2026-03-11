import { Request, Response } from "express";
import productController from "@/modules/products/product.controller";
import memberController from "@/modules/members/member.controller";
import saleController from "@/modules/sales/sale.controller";
import bulkService from "./bulk.service";

/**
 * Bulk controller — thin HTTP layer. Delegates to product/member/sale controllers by type.
 */
class BulkController {
  bulkUpload = async (req: Request, res: Response): Promise<void> => {
    const type = bulkService.parseType(
      req.params?.type ?? req.query?.type ?? req.body?.type,
    );
    if (!type) {
      res.status(400).json({
        message: "Invalid or missing type. Use type=products|members|sales",
      });
      return;
    }
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
  };

  downloadTemplate = async (req: Request, res: Response): Promise<void> => {
    const type = bulkService.parseType(req.query?.type);
    if (!type) {
      res.status(400).json({
        message: "Invalid or missing type. Use type=products|members|sales",
      });
      return;
    }

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
  };

  download = async (req: Request, res: Response): Promise<void> => {
    const type = bulkService.parseType(req.query?.type);
    if (!type) {
      res.status(400).json({
        message: "Invalid or missing type. Use type=products|members|sales",
      });
      return;
    }

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
  };
}

const bulkController = new BulkController();

export { bulkController };
export default bulkController;
