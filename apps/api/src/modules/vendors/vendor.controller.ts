import { Request, Response } from "express";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { ok, okPaginated, fail } from "@/shared/response";
import { vendorsService } from "./vendors.service";

class VendorController {
  async createVendor(req: Request, res: Response) {
    const auth = req.authContext!;

    const { name, contact, phone, address } = req.body;
    const vendor = await vendorsService.create(auth.tenantId, {
      name,
      contact,
      phone,
      address,
    });
    return ok(res, { vendor }, 201, "Vendor created successfully");
  }

  async getAllVendors(req: Request, res: Response) {
    const auth = req.authContext!;

    const query = getValidatedQuery<{
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: "id" | "name" | "createdAt" | "updatedAt";
      sortOrder?: "asc" | "desc";
    }>(req, res);

    const result = await vendorsService.getAll(auth.tenantId, query);
    return okPaginated(
      res,
      result.data,
      result.pagination,
      "Vendors fetched successfully",
    );
  }

  async getVendorById(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const vendor = await vendorsService.getById(id, auth.tenantId);
    return ok(res, { vendor }, 200, "Vendor fetched successfully");
  }

  async getVendorProducts(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const query = getValidatedQuery<{
      page?: number;
      limit?: number;
      search?: string;
    }>(req, res);

    const result = await vendorsService.getVendorProducts(
      id,
      auth.tenantId,
      query,
    );
    return okPaginated(
      res,
      result.data,
      result.pagination,
      "Vendor products fetched successfully",
    );
  }

  async updateVendor(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const { name, contact, phone, address } = req.body;
    const vendor = await vendorsService.update(id, auth.tenantId, {
      name,
      contact,
      phone,
      address,
    });
    return ok(res, { vendor }, 200, "Vendor updated successfully");
  }

  async deleteVendor(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    await vendorsService.delete(id, auth.tenantId);
    return ok(res, undefined, 200, "Vendor deleted successfully");
  }
}

const vendorController = new VendorController();
export default vendorController;
