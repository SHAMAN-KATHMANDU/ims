import { Request, Response } from "express";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { ok } from "@/shared/response";
import { notificationsService } from "./notifications.service";

class NotificationController {
  async getAll(req: Request, res: Response) {
    const auth = req.authContext!;

    const query = getValidatedQuery<{
      limit?: number;
      unreadOnly?: boolean;
    }>(req, res);

    const notifications = await notificationsService.getAll(auth.userId, query);
    return ok(res, { notifications }, 200, "OK");
  }

  async getUnreadCount(req: Request, res: Response) {
    const auth = req.authContext!;

    const count = await notificationsService.getUnreadCount(auth.userId);
    return ok(res, { count });
  }

  async markRead(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    await notificationsService.markRead(id, auth.userId);
    return ok(res, undefined, 200, "Notification marked as read");
  }

  async markAllRead(req: Request, res: Response) {
    const auth = req.authContext!;

    await notificationsService.markAllRead(auth.userId);
    return ok(res, undefined, 200, "All notifications marked as read");
  }
}

export default new NotificationController();
