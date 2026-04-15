import { Request, Response } from "express";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import service from "./public-page-preview.service";

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? "");
}

function getQueryString(req: Request, key: string): string {
  const v = req.query[key];
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : "";
  return typeof v === "string" ? v : "";
}

function handleAppError(res: Response, error: unknown): Response | null {
  const err = error as AppError;
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  return null;
}

class PublicPagePreviewController {
  getDraftPreview = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const token = getQueryString(req, "token");
      if (!token) {
        return res.status(400).json({ message: "Missing token" });
      }
      const result = await service.getDraftPreview(id, token);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get draft page preview error")
      );
    }
  };
}

export default new PublicPagePreviewController();
