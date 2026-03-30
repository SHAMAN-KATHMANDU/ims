import { Request, Response } from "express";
import { ZodError } from "zod";
import type { AppError } from "@/middlewares/errorHandler";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { ok, fail } from "@/shared/response";
import { sendControllerError } from "@/utils/controllerError";
import {
  ListMediaQuerySchema,
  PresignBodySchema,
  RegisterMediaAssetSchema,
} from "./media.schema";
import { MediaService } from "./media.service";

const service = new MediaService();

function mapZodError(err: ZodError): string {
  const first = err.issues[0];
  return first?.message ?? "Validation failed";
}

function mapAppError(error: unknown): AppError | null {
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof (error as AppError).statusCode === "number" &&
    "message" in error &&
    typeof (error as AppError).message === "string"
  ) {
    return error as AppError;
  }
  return null;
}

class MediaController {
  async presign(req: Request, res: Response) {
    try {
      const { tenantId } = getAuthContext(req);
      const body = PresignBodySchema.parse(req.body);
      const result = await service.presign(tenantId, body);
      return ok(res, result);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return fail(res, mapZodError(error), 400);
      }
      const httpErr = mapAppError(error);
      if (httpErr?.statusCode && httpErr.message) {
        return fail(res, httpErr.message, httpErr.statusCode);
      }
      return sendControllerError(req, res, error, "media presign");
    }
  }

  async register(req: Request, res: Response) {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const body = RegisterMediaAssetSchema.parse(req.body);
      const asset = await service.registerAsset(tenantId, userId, body);
      return ok(res, { asset }, 201);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return fail(res, mapZodError(error), 400);
      }
      const httpErr = mapAppError(error);
      if (httpErr?.statusCode && httpErr.message) {
        return fail(res, httpErr.message, httpErr.statusCode);
      }
      return sendControllerError(req, res, error, "media register");
    }
  }

  async list(req: Request, res: Response) {
    try {
      const { tenantId } = getAuthContext(req);
      const q = ListMediaQuerySchema.parse(req.query);
      const { items, nextCursor } = await service.listAssets(tenantId, {
        take: q.limit,
        cursorId: q.cursor,
      });
      return ok(res, { items, nextCursor });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return fail(res, mapZodError(error), 400);
      }
      return sendControllerError(req, res, error, "media list");
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const { tenantId } = getAuthContext(req);
      const { id } = req.params;
      if (!id) return fail(res, "Missing id", 400);
      await service.deleteAsset(tenantId, id);
      return ok(res, { deleted: true });
    } catch (error: unknown) {
      const httpErr = mapAppError(error);
      if (httpErr?.statusCode === 404 && httpErr.message) {
        return fail(res, httpErr.message, 404);
      }
      return sendControllerError(req, res, error, "media delete");
    }
  }
}

export default new MediaController();
