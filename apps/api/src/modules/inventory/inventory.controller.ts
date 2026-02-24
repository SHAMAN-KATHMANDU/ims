import { Request, Response } from "express";
import { ok } from "@/shared/response";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import * as inventoryService from "./inventory.service";

class InventoryController {
  async getLocationInventory(req: Request, res: Response) {
    const auth = req.authContext!;

    const { locationId } = req.params;
    const query = getValidatedQuery<inventoryService.LocationInventoryQuery>(
      req,
      res,
    );
    const result = await inventoryService.getLocationInventory(
      auth.tenantId,
      locationId,
      query,
    );
    return ok(
      res,
      {
        location: result.location,
        data: result.data,
        pagination: result.pagination,
      },
      200,
      "Location inventory fetched successfully",
    );
  }

  async getProductStock(req: Request, res: Response) {
    const auth = req.authContext!;

    const { productId } = req.params;
    const result = await inventoryService.getProductStock(
      auth.tenantId,
      productId,
    );
    return ok(res, result, 200, "Product stock fetched successfully");
  }

  async adjustInventory(req: Request, res: Response) {
    const auth = req.authContext!;

    const result = await inventoryService.adjustInventory(
      auth.tenantId,
      req.body,
    );
    return ok(res, result, 200, "Inventory adjusted successfully");
  }

  async setInventory(req: Request, res: Response) {
    const auth = req.authContext!;

    const result = await inventoryService.setInventory(auth.tenantId, req.body);
    return ok(res, result, 200, "Inventory set successfully");
  }

  async getInventorySummary(req: Request, res: Response) {
    const auth = req.authContext!;

    const result = await inventoryService.getInventorySummary(auth.tenantId);
    return ok(res, result, 200, "Inventory summary fetched successfully");
  }
}

export default new InventoryController();
