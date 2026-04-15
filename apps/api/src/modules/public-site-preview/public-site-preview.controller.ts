/**
 * public-site-preview controller — thin HTTP layer for token-gated site
 * preview requests.
 */

import { Request, Response } from "express";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import service from "./public-site-preview.service";

function readToken(req: Request): string | null {
  const raw = req.query.token;
  if (typeof raw !== "string" || raw.length === 0) return null;
  return raw;
}

function readString(req: Request, key: string): string | undefined {
  const raw = req.query[key];
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  return raw;
}

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? "");
}

class PublicSitePreviewController {
  getSitePreview = async (req: Request, res: Response) => {
    try {
      const token = readToken(req);
      if (!token) {
        return res
          .status(400)
          .json({ message: "Missing preview token in query" });
      }
      const scope = getParam(req, "scope");
      const productId = readString(req, "productId");
      const result = await service.getPreview(token, scope, { productId });
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      const err = error as AppError;
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      return sendControllerError(req, res, error, "Get site preview error");
    }
  };
}

export default new PublicSitePreviewController();
