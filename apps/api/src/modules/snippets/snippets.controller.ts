/**
 * Snippets controller — Phase 5.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import service from "./snippets.service";
import {
  CreateSnippetSchema,
  UpdateSnippetSchema,
  ListSnippetsQuerySchema,
} from "./snippets.schema";

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

class SnippetsController {
  list = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const query = ListSnippetsQuerySchema.parse(req.query);
      const result = await service.list(tenantId, query);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List snippets error")
      );
    }
  };

  get = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const id = getParam(req, "id");
      const snippet = await service.get(tenantId, id);
      return res.status(200).json({ message: "OK", snippet });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get snippet error")
      );
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const body = CreateSnippetSchema.parse(req.body);
      const snippet = await service.create(tenantId, body);
      return res.status(201).json({ message: "Snippet created", snippet });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Create snippet error")
      );
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const id = getParam(req, "id");
      const body = UpdateSnippetSchema.parse(req.body);
      const snippet = await service.update(tenantId, id, body);
      return res.status(200).json({ message: "Snippet updated", snippet });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update snippet error")
      );
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const id = getParam(req, "id");
      await service.delete(tenantId, id);
      return res.status(200).json({ message: "Snippet deleted" });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete snippet error")
      );
    }
  };
}

export default new SnippetsController();
