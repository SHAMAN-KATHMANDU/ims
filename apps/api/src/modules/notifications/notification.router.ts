import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import notificationController from "./notification.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const notificationRouter = Router();

notificationRouter.use(authorizeRoles("user", "admin", "superAdmin"));

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get all notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Notifications list }
 */
notificationRouter.get("/", asyncHandler(notificationController.getAll));

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Unread count }
 */
notificationRouter.get(
  "/unread-count",
  asyncHandler(notificationController.getUnreadCount),
);

/**
 * @swagger
 * /notifications/{id}/read:
 *   post:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Notification marked read }
 */
notificationRouter.post(
  "/:id/read",
  asyncHandler(notificationController.markRead),
);

/**
 * @swagger
 * /notifications/read-all:
 *   post:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: All marked read }
 */
notificationRouter.post(
  "/read-all",
  asyncHandler(notificationController.markAllRead),
);

/**
 * @swagger
 * /notifications:
 *   delete:
 *     summary: Delete all notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: All notifications deleted }
 */
notificationRouter.delete("/", asyncHandler(notificationController.deleteAll));

export default notificationRouter;
