import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import { DeleteBodySchema } from "@/shared/schemas/deleteBody.schema";
import {
  CreateDealSchema,
  UpdateDealSchema,
  UpdateDealStageSchema,
  AddDealLineItemSchema,
  ConvertDealToSaleSchema,
} from "./deal.schema";
import dealService from "./deal.service";
import { checkDiscountAuthority } from "./discount-authority.service";

class DealController {
  create = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const body = CreateDealSchema.parse(req.body);
      const deal = await dealService.create(tenantId, body, userId);
      return res
        .status(201)
        .json({ message: "Deal created successfully", deal });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Create deal error");
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const result = await dealService.getAll(
        tenantId,
        req.query as Record<string, unknown>,
      );
      return res.status(200).json({ message: "OK", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get deals error");
    }
  };

  getByPipeline = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const pipelineId = req.query.pipelineId as string | undefined;
      const result = await dealService.getByPipeline(tenantId, pipelineId);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Get deals by pipeline error",
      );
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const deal = await dealService.getById(tenantId, req.params.id);
      return res.status(200).json({ message: "OK", deal });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Get deal by id error");
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const body = UpdateDealSchema.parse(req.body);
      const deal = await dealService.update(
        tenantId,
        req.params.id,
        body,
        userId,
      );
      return res
        .status(200)
        .json({ message: "Deal updated successfully", deal });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Update deal error");
    }
  };

  updateStage = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const body = UpdateDealStageSchema.parse(req.body);
      const deal = await dealService.updateStage(
        tenantId,
        req.params.id,
        body,
        userId,
      );
      return res.status(200).json({ message: "Deal stage updated", deal });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Update deal stage error");
    }
  };

  addLineItem = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = AddDealLineItemSchema.parse(req.body);
      const item = await dealService.addLineItem(tenantId, req.params.id, body);
      return res.status(201).json({ message: "Line item added", item });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Add line item error");
    }
  };

  removeLineItem = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const lineItemId = req.params.lineItemId;
      await dealService.removeLineItem(tenantId, req.params.id, lineItemId);
      return res.status(200).json({ message: "Line item removed" });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Remove line item error");
    }
  };

  convertToSale = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const body = ConvertDealToSaleSchema.parse(req.body);
      const sale = await dealService.convertToSale(
        tenantId,
        req.params.id,
        userId,
        body,
      );
      return res.status(201).json({ message: "Deal converted to sale", sale });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Convert to sale error");
    }
  };

  checkDiscount = async (req: Request, res: Response) => {
    try {
      const { pipelineType, purchaseCount, discountPercent } = req.body;
      const result = checkDiscountAuthority({
        pipelineType: pipelineType ?? "GENERAL",
        purchaseCount: Number(purchaseCount) || 0,
        discountPercent: Number(discountPercent) || 0,
      });
      return res.status(200).json(result);
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Check discount authority error",
      );
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const deleteBody = DeleteBodySchema.parse(req.body ?? {});
      const ip = typeof req.ip === "string" ? req.ip : undefined;
      const userAgent = req.get("user-agent");
      await dealService.delete(tenantId, id, {
        userId,
        reason: deleteBody.reason,
        ip,
        userAgent,
      });
      return res.status(200).json({ message: "Deal deleted successfully" });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Delete deal error");
    }
  };
}

export default new DealController();
