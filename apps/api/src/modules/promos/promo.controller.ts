import { Request, Response } from "express";
import { ZodError } from "zod";
import type { AppError } from "@/middlewares/errorHandler";
import { sendControllerError } from "@/utils/controllerError";
import { DeleteBodySchema } from "@/shared/schemas/deleteBody.schema";
import promoService, { PromoService } from "./promo.service";
import { CreatePromoSchema, UpdatePromoSchema } from "./promo.schema";

function getParam(req: Request, key: "id"): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
}

class PromoController {
  constructor(private service: PromoService) {}

  createPromo = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = CreatePromoSchema.parse(req.body);

      const promo = await this.service.create(tenantId, body);

      return res.status(201).json({
        message: "Promo code created successfully",
        promo,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr?.statusCode === 409) {
        return res.status(409).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Create promo error");
    }
  };

  getAllPromos = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const result = await this.service.findAll(tenantId, req.query);

      return res.status(200).json({
        message: "Promo codes fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get promos error");
    }
  };

  getPromoById = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const id = getParam(req, "id");

      const promo = await this.service.findById(tenantId, id);

      if (!promo) {
        return res.status(404).json({ message: "Promo code not found" });
      }

      return res.status(200).json({
        message: "Promo code fetched successfully",
        promo,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get promo by ID error");
    }
  };

  updatePromo = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const id = getParam(req, "id");
      const body = UpdatePromoSchema.parse(req.body);

      const promo = await this.service.update(tenantId, id, body);

      if (!promo) {
        return res.status(404).json({ message: "Promo code not found" });
      }

      return res.status(200).json({
        message: "Promo code updated successfully",
        promo,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr?.statusCode === 409) {
        return res.status(409).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Update promo error");
    }
  };

  deletePromo = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const id = getParam(req, "id");
      const deleteBody = DeleteBodySchema.parse(req.body ?? {});
      const ip = typeof req.ip === "string" ? req.ip : undefined;
      const userAgent = req.get("user-agent");

      const result = await this.service.delete(tenantId, id, {
        userId,
        reason: deleteBody.reason,
        ip,
        userAgent,
      });

      if (!result) {
        return res.status(404).json({ message: "Promo code not found" });
      }

      return res.status(200).json({
        message: "Promo code deactivated successfully",
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete promo error");
    }
  };
}

export default new PromoController(promoService);
