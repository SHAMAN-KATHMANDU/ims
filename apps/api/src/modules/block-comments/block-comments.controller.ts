/**
 * Block-comments controller — Phase 6.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import { blockCommentsService } from "./block-comments.service";
import {
  CreateCommentSchema,
  ListCommentsQuerySchema,
} from "./block-comments.schema";

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

class BlockCommentsController {
  list = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const query = ListCommentsQuerySchema.parse(req.query);
      const comments = await blockCommentsService.list(tenantId, query);
      return res.status(200).json({ message: "OK", comments });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List comments error")
      );
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const input = CreateCommentSchema.parse(req.body);
      const comment = await blockCommentsService.create({
        tenantId,
        authorId: userId,
        input,
      });
      return res.status(201).json({ message: "Comment posted", comment });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Create comment error")
      );
    }
  };

  resolve = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const id = getParam(req, "id");
      const comment = await blockCommentsService.resolve({
        tenantId,
        userId,
        id,
      });
      return res.status(200).json({ message: "Resolved", comment });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Resolve comment error")
      );
    }
  };

  reopen = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const id = getParam(req, "id");
      const comment = await blockCommentsService.reopen({
        tenantId,
        userId,
        id,
      });
      return res.status(200).json({ message: "Reopened", comment });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Reopen comment error")
      );
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId, role } = getAuthContext(req);
      const id = getParam(req, "id");
      await blockCommentsService.remove({
        tenantId,
        userId,
        role,
        id,
      });
      return res.status(200).json({ message: "Deleted" });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete comment error")
      );
    }
  };
}

export default new BlockCommentsController();
