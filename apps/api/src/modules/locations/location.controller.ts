import { Request, Response } from "express";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { getPaginationParams } from "@/utils/pagination";
import { ok, okPaginated, fail } from "@/shared/response";
import { locationsService } from "./locations.service";

class LocationController {
  async createLocation(req: Request, res: Response) {
    const auth = req.authContext!;

    const { name, type, address, isDefaultWarehouse } = req.body;
    const location = await locationsService.create(auth.tenantId, {
      name,
      type,
      address,
      isDefaultWarehouse,
    });
    return ok(res, { location }, 201, "Location created successfully");
  }

  async getAllLocations(req: Request, res: Response) {
    const auth = req.authContext!;

    const query = getValidatedQuery<{
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      type?: "WAREHOUSE" | "SHOWROOM";
      activeOnly?: boolean;
      status?: "active" | "inactive";
    }>(req, res);

    const result = await locationsService.getAll(auth.tenantId, query);
    return okPaginated(
      res,
      result.data,
      result.pagination,
      "Locations fetched successfully",
    );
  }

  async getLocationById(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const location = await locationsService.getById(id);
    return ok(res, { location }, 200, "Location fetched successfully");
  }

  async updateLocation(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const { name, type, address, isActive, isDefaultWarehouse } = req.body;
    const location = await locationsService.update(id, auth.tenantId, {
      name,
      type,
      address,
      isActive,
      isDefaultWarehouse,
    });
    return ok(res, { location }, 200, "Location updated successfully");
  }

  async deleteLocation(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    await locationsService.delete(id, auth.tenantId);
    return ok(res, undefined, 200, "Location deactivated successfully");
  }

  async getLocationInventory(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const { page, limit, search } = getPaginationParams(req.query);
    const { location, data, pagination } =
      await locationsService.getLocationInventory(id, { page, limit, search });
    return ok(
      res,
      {
        location,
        data,
        pagination,
      },
      200,
      "Location inventory fetched successfully",
    );
  }
}

export default new LocationController();
