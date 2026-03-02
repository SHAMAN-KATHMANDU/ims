import { Request, Response } from "express";
import { sendControllerError } from "@/utils/controllerError";
import type { AppError } from "@/middlewares/errorHandler";
import dashboardService from "./dashboard.service";

class DashboardController {
  getUserSummary = async (req: Request, res: Response) => {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const data = await dashboardService.getUserSummary(userId);
      return res.status(200).json({ message: "OK", data });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (typeof appErr.statusCode === "number") {
        return res.status(appErr.statusCode).json({
          message: appErr.message,
        });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Dashboard getUserSummary error",
      );
    }
  };

  getAdminSummary = async (req: Request, res: Response) => {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const data = await dashboardService.getAdminSummary(userId);
      return res.status(200).json({ message: "OK", data });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (typeof appErr.statusCode === "number") {
        return res.status(appErr.statusCode).json({
          message: appErr.message,
        });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Dashboard getAdminSummary error",
      );
    }
  };

  getSuperAdminSummary = async (req: Request, res: Response) => {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const data = await dashboardService.getSuperAdminSummary(userId);
      return res.status(200).json({ message: "OK", data });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (typeof appErr.statusCode === "number") {
        return res.status(appErr.statusCode).json({
          message: appErr.message,
        });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Dashboard getSuperAdminSummary error",
      );
    }
  };
}

export default new DashboardController();
