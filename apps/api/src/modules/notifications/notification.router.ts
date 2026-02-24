import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import notificationController from "./notification.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const notificationRouter = Router();

notificationRouter.use(authorizeRoles("user", "admin", "superAdmin"));

notificationRouter.get("/", asyncHandler(notificationController.getAll));
notificationRouter.get(
  "/unread-count",
  asyncHandler(notificationController.getUnreadCount),
);
notificationRouter.post(
  "/:id/read",
  asyncHandler(notificationController.markRead),
);
notificationRouter.post(
  "/read-all",
  asyncHandler(notificationController.markAllRead),
);

export default notificationRouter;
