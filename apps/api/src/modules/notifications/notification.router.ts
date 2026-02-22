import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import notificationController from "./notification.controller";
import { asyncHandler } from "@/middlewares/errorHandler";
import { validateParams, validateQuery } from "@/middlewares/validateRequest";
import {
  notificationIdParamsSchema,
  notificationsListQuerySchema,
} from "./notification.schema";

const notificationRouter = Router();

notificationRouter.use(verifyToken);
notificationRouter.use(authorizeRoles("user", "admin", "superAdmin"));

notificationRouter.get(
  "/",
  validateQuery(notificationsListQuerySchema),
  asyncHandler(notificationController.getAll),
);
notificationRouter.get(
  "/unread-count",
  asyncHandler(notificationController.getUnreadCount),
);
notificationRouter.post(
  "/:id/read",
  validateParams(notificationIdParamsSchema),
  asyncHandler(notificationController.markRead),
);
notificationRouter.post(
  "/read-all",
  asyncHandler(notificationController.markAllRead),
);

export default notificationRouter;
