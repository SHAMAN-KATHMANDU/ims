import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import notificationController from "./notification.controller";

const notificationRouter = Router();

notificationRouter.use(verifyToken);
notificationRouter.use(authorizeRoles("user", "admin", "superAdmin"));

notificationRouter.get("/", notificationController.getAll);
notificationRouter.get("/unread-count", notificationController.getUnreadCount);
notificationRouter.post("/:id/read", notificationController.markRead);
notificationRouter.post("/read-all", notificationController.markAllRead);

export default notificationRouter;
