import { Request, Response } from "express";
import { NotificationListQuerySchema } from "./notification.schema";
import notificationService from "./notification.service";
import { sendControllerError } from "@/utils/controllerError";
import type { AppError } from "@/middlewares/errorHandler";

const handleAppError = (res: Response, error: unknown): Response | null => {
  if ((error as AppError).statusCode) {
    return res
      .status((error as AppError).statusCode!)
      .json({ message: (error as AppError).message });
  }
  return null;
};

class NotificationController {
  getAll = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const query = NotificationListQuerySchema.parse(req.query);
      const result = await notificationService.getAll(userId, query);
      return res.status(200).json({
        message: "OK",
        notifications: result.notifications,
        pagination: result.pagination,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get notifications error");
    }
  };

  getUnreadCount = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const count = await notificationService.getUnreadCount(userId);
      return res.status(200).json({ message: "OK", count });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get unread count error");
    }
  };

  markRead = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      await notificationService.markRead(userId, id);
      return res.status(200).json({ message: "Notification marked as read" });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Mark read error")
      );
    }
  };

  markAllRead = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      await notificationService.markAllRead(userId);
      return res
        .status(200)
        .json({ message: "All notifications marked as read" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Mark all read error");
    }
  };

  deleteAll = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      await notificationService.deleteAll(userId);
      return res.status(200).json({ message: "All notifications cleared" });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Delete all notifications error",
      );
    }
  };
}

export default new NotificationController();
