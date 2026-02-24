import { Request, Response } from "express";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { ok, okPaginated, fail } from "@/shared/response";
import { promosService } from "./promos.service";

class PromoController {
  async createPromo(req: Request, res: Response) {
    const auth = req.authContext!;

    const {
      code,
      description,
      valueType,
      value,
      overrideDiscounts,
      allowStacking,
      eligibility,
      validFrom,
      validTo,
      usageLimit,
      isActive,
      productIds,
      applyToAll,
      categoryIds,
      subCategories,
    } = req.body;

    const promo = await promosService.create(auth.tenantId, {
      code,
      description,
      valueType,
      value,
      overrideDiscounts,
      allowStacking,
      eligibility,
      validFrom,
      validTo,
      usageLimit,
      isActive,
      productIds,
      applyToAll,
      categoryIds,
      subCategories,
    });
    return ok(res, { promo }, 201, "Promo code created successfully");
  }

  async getAllPromos(req: Request, res: Response) {
    const auth = req.authContext!;

    const query = getValidatedQuery<{
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      isActive?: boolean;
    }>(req, res);

    const result = await promosService.getAll(auth.tenantId, query);
    return okPaginated(
      res,
      result.data,
      result.pagination,
      "Promo codes fetched successfully",
    );
  }

  async getPromoById(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const promo = await promosService.getById(id, auth.tenantId);
    return ok(res, { promo }, 200, "Promo code fetched successfully");
  }

  async updatePromo(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const {
      code,
      description,
      valueType,
      value,
      overrideDiscounts,
      allowStacking,
      eligibility,
      validFrom,
      validTo,
      usageLimit,
      isActive,
      productIds,
      applyToAll,
      categoryIds,
      subCategories,
    } = req.body;

    const promo = await promosService.update(id, auth.tenantId, {
      code,
      description,
      valueType,
      value,
      overrideDiscounts,
      allowStacking,
      eligibility,
      validFrom,
      validTo,
      usageLimit,
      isActive,
      productIds,
      applyToAll,
      categoryIds,
      subCategories,
    });
    return ok(res, { promo }, 200, "Promo code updated successfully");
  }

  async deletePromo(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    await promosService.delete(id, auth.tenantId);
    return ok(res, undefined, 200, "Promo code deactivated successfully");
  }
}

export default new PromoController();
