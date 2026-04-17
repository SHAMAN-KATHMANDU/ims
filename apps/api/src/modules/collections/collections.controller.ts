/**
 * Collections controller — tenant-admin HTTP layer for curated
 * groupings. Gate: admin/superAdmin (enforced on the router).
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import service from "./collections.service";
import {
  CreateCollectionSchema,
  SetCollectionProductsSchema,
  UpdateCollectionSchema,
} from "./collections.schema";

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

class CollectionsController {
  list = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const collections = await service.list(tenantId);
      return res.status(200).json({ message: "OK", collections });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List collections error")
      );
    }
  };

  get = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = req.params.id ?? "";
      const collection = await service.get(tenantId, id);
      return res.status(200).json({ message: "OK", collection });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get collection error")
      );
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = CreateCollectionSchema.parse(req.body);
      const collection = await service.create(tenantId, body);
      return res
        .status(201)
        .json({ message: "Collection created", collection });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Create collection error")
      );
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = req.params.id ?? "";
      const body = UpdateCollectionSchema.parse(req.body);
      const collection = await service.update(tenantId, id, body);
      return res
        .status(200)
        .json({ message: "Collection updated", collection });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update collection error")
      );
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = req.params.id ?? "";
      await service.remove(tenantId, id);
      return res.status(200).json({ message: "Collection deleted" });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete collection error")
      );
    }
  };

  setProducts = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = req.params.id ?? "";
      const body = SetCollectionProductsSchema.parse(req.body);
      const result = await service.setProducts(tenantId, id, body.productIds);
      return res
        .status(200)
        .json({ message: "Collection products updated", ...result });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Set collection products error")
      );
    }
  };
}

export default new CollectionsController();
