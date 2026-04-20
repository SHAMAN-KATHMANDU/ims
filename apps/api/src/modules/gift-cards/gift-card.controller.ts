import { Request, Response } from "express";
import { ZodError } from "zod";
import type { AppError } from "@/middlewares/errorHandler";
import { sendControllerError } from "@/utils/controllerError";
import giftCardService, { GiftCardService } from "./gift-card.service";
import {
  CreateGiftCardSchema,
  UpdateGiftCardSchema,
  RedeemGiftCardSchema,
} from "./gift-card.schema";

function getParam(req: Request, key: "id"): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? "");
}

class GiftCardController {
  constructor(private service: GiftCardService) {}

  createGiftCard = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = CreateGiftCardSchema.parse(req.body);
      const giftCard = await this.service.create(tenantId, body);
      return res.status(201).json({ message: "Gift card created", giftCard });
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
      return sendControllerError(req, res, error, "Create gift card error");
    }
  };

  getAllGiftCards = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const result = await this.service.findAll(tenantId, req.query);
      return res.status(200).json({ message: "Gift cards fetched", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get gift cards error");
    }
  };

  getGiftCardById = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const id = getParam(req, "id");
      const giftCard = await this.service.findById(tenantId, id);
      if (!giftCard) {
        return res.status(404).json({ message: "Gift card not found" });
      }
      return res.status(200).json({ message: "Gift card fetched", giftCard });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get gift card error");
    }
  };

  updateGiftCard = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const id = getParam(req, "id");
      const body = UpdateGiftCardSchema.parse(req.body);
      const giftCard = await this.service.update(tenantId, id, body);
      if (!giftCard) {
        return res.status(404).json({ message: "Gift card not found" });
      }
      return res.status(200).json({ message: "Gift card updated", giftCard });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr?.statusCode === 400 || appErr?.statusCode === 409) {
        return res.status(appErr.statusCode).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Update gift card error");
    }
  };

  redeemGiftCard = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { code, amount } = RedeemGiftCardSchema.parse(req.body);
      const result = await this.service.redeem(tenantId, code, amount);
      return res.status(200).json({ message: "Gift card redeemed", ...result });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr?.statusCode === 404 || appErr?.statusCode === 409) {
        return res.status(appErr.statusCode).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Redeem gift card error");
    }
  };
}

export default new GiftCardController(giftCardService);
