import { Request, Response } from "express";
import { sendControllerError } from "@/utils/controllerError";
import type { AppError } from "@/middlewares/errorHandler";
import { AdjustInventorySchema, SetInventorySchema } from "./inventory.schema";
import inventoryService from "./inventory.service";

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
}

class InventoryController {
  getLocationInventory = async (req: Request, res: Response) => {
    try {
      const locationId = getParam(req, "locationId");
      const result = await inventoryService.getLocationInventory(
        locationId,
        req.query as Record<string, unknown>,
      );
      return res.status(200).json({
        message: "Location inventory fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (typeof appErr.statusCode === "number") {
        return res.status(appErr.statusCode).json({ message: appErr.message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Get location inventory error",
      );
    }
  };

  getProductStock = async (req: Request, res: Response) => {
    try {
      const productId = getParam(req, "productId");
      const result = await inventoryService.getProductStock(productId);
      return res.status(200).json({
        message: "Product stock fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (typeof appErr.statusCode === "number") {
        return res.status(appErr.statusCode).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Get product stock error");
    }
  };

  adjustInventory = async (req: Request, res: Response) => {
    try {
      const parsed = AdjustInventorySchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.errors[0]?.message ?? "Invalid request body";
        return res.status(400).json({ message: msg });
      }

      const adjustment = await inventoryService.adjustInventory(parsed.data);
      return res.status(200).json({
        message: "Inventory adjusted successfully",
        adjustment,
      });
    } catch (error: unknown) {
      const appErr = error as AppError & {
        currentQuantity?: number;
        adjustmentAmount?: number;
      };
      if (typeof appErr.statusCode === "number") {
        const body: Record<string, unknown> = { message: appErr.message };
        if (typeof appErr.currentQuantity === "number") {
          body.currentQuantity = appErr.currentQuantity;
          body.adjustmentAmount = appErr.adjustmentAmount;
        }
        return res.status(appErr.statusCode).json(body);
      }
      return sendControllerError(req, res, error, "Adjust inventory error");
    }
  };

  setInventory = async (req: Request, res: Response) => {
    try {
      const parsed = SetInventorySchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.errors[0]?.message ?? "Invalid request body";
        return res.status(400).json({ message: msg });
      }

      const inventory = await inventoryService.setInventory(parsed.data);
      return res.status(200).json({
        message: "Inventory set successfully",
        inventory,
      });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (typeof appErr.statusCode === "number") {
        return res.status(appErr.statusCode).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Set inventory error");
    }
  };

  getInventorySummary = async (req: Request, res: Response) => {
    try {
      const result = await inventoryService.getInventorySummary();
      return res.status(200).json({
        message: "Inventory summary fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (typeof appErr.statusCode === "number") {
        return res.status(appErr.statusCode).json({ message: appErr.message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Get inventory summary error",
      );
    }
  };
}

export default new InventoryController();
