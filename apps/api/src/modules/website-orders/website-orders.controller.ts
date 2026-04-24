/**
 * WebsiteOrders Controller — thin HTTP layer for tenant-admin actions.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import service from "./website-orders.service";
import {
  ConvertOrderSchema,
  ListWebsiteOrdersQuerySchema,
  RejectOrderSchema,
} from "./website-orders.schema";

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? "");
}

function handleZodError(res: Response, error: unknown): Response | null {
  if (error instanceof ZodError) {
    return res
      .status(400)
      .json({ message: error.errors[0]?.message ?? "Validation error" });
  }
  return null;
}

function handleAppError(res: Response, error: unknown): Response | null {
  const err = error as AppError;
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  return null;
}

class WebsiteOrdersController {
  listOrders = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const query = ListWebsiteOrdersQuerySchema.parse(req.query);
      const result = await service.listOrders(tenantId, query, userId);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List website orders error")
      );
    }
  };

  getOrder = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      const order = await service.getOrder(tenantId, id);
      return res.status(200).json({ message: "OK", order });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get website order error")
      );
    }
  };

  verifyOrder = async (req: Request, res: Response) => {
    try {
      const auth = getAuthContext(req);
      const id = getParam(req, "id");
      const order = await service.verifyOrder(auth.tenantId, id, auth.userId);
      return res.status(200).json({ message: "Order verified", order });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Verify website order error")
      );
    }
  };

  rejectOrder = async (req: Request, res: Response) => {
    try {
      const auth = getAuthContext(req);
      const id = getParam(req, "id");
      const body = RejectOrderSchema.parse(req.body);
      const order = await service.rejectOrder(
        auth.tenantId,
        id,
        auth.userId,
        body,
      );
      return res.status(200).json({ message: "Order rejected", order });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Reject website order error")
      );
    }
  };

  convertOrder = async (req: Request, res: Response) => {
    try {
      const auth = getAuthContext(req);
      const id = getParam(req, "id");
      const body = ConvertOrderSchema.parse(req.body);
      const order = await service.convertToSale(
        auth.tenantId,
        id,
        auth.userId,
        body,
      );
      return res
        .status(200)
        .json({ message: "Order converted to sale", order });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Convert website order error")
      );
    }
  };

  checkOrderStock = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      const result = await service.checkOrderStock(tenantId, id);
      return res.status(200).json(result);
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Check order stock error")
      );
    }
  };

  deleteOrder = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const id = getParam(req, "id");
      await service.deleteOrder(tenantId, id, userId);
      return res.status(200).json({ message: "Order deleted" });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete website order error")
      );
    }
  };
}

export default new WebsiteOrdersController();
