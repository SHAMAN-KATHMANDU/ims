import { Request, Response } from "express";
import prisma from "@/config/prisma";
import { sendControllerError } from "@/utils/controllerError";

function getUserId(req: Request): string | null {
  return (req as any).user?.id ?? null;
}

class NotificationController {
  async getAll(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const { limit = 20, unreadOnly = false } = req.query as {
        limit?: number;
        unreadOnly?: boolean;
      };

      const where: { userId: string; readAt?: null } = { userId };
      if (unreadOnly) {
        where.readAt = null;
      }

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      res.status(200).json({ message: "OK", notifications });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get notifications error");
    }
  }

  async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const count = await prisma.notification.count({
        where: { userId, readAt: null },
      });

      res.status(200).json({ message: "OK", count });
    } catch (error: unknown) {
      console.error("Get unread count error:", error);
      res.status(500).json({
        message: "Error fetching unread count",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async markRead(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const { id } = req.params;

      const notification = await prisma.notification.findFirst({
        where: { id, userId },
      });

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      await prisma.notification.update({
        where: { id },
        data: { readAt: new Date() },
      });

      res.status(200).json({ message: "Notification marked as read" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Mark read error");
    }
  }

  async markAllRead(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      await prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });

      res.status(200).json({ message: "All notifications marked as read" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Mark all read error");
    }
  }
}

export default new NotificationController();
