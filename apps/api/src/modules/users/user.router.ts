import { Router } from "express";
import { requirePermission } from "@/middlewares/requirePermission";
import {
  paramLocator,
  workspaceLocator,
} from "@/shared/permissions/resourceLocator";
import { enforcePlanLimits } from "@/middlewares/enforcePlanLimits";
import userController from "@/modules/users/user.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const userRouter = Router();

/**
 * @swagger
 * /users/password-reset-requests:
 *   get:
 *     summary: Get password reset requests
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Password reset requests for tenant
 */
userRouter.get(
  "/password-reset-requests",
  requirePermission("SETTINGS.USERS.RESET_PASSWORD", workspaceLocator()),
  asyncHandler(userController.getPasswordResetRequests),
);

/**
 * @swagger
 * /users/password-reset-requests/{requestId}/approve:
 *   post:
 *     summary: Approve password reset
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: Approved }
 */
userRouter.post(
  "/password-reset-requests/:requestId/approve",
  requirePermission("SETTINGS.USERS.RESET_PASSWORD", workspaceLocator()),
  asyncHandler(userController.approveResetRequest),
);

/**
 * @swagger
 * /users/password-reset-requests/{requestId}/escalate:
 *   post:
 *     summary: Escalate password reset to platform admin
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Escalated }
 */
userRouter.post(
  "/password-reset-requests/:requestId/escalate",
  requirePermission("SETTINGS.USERS.RESET_PASSWORD", workspaceLocator()),
  asyncHandler(userController.escalateResetRequest),
);

/**
 * @swagger
 * /users/password-reset-requests/{requestId}/reject:
 *   post:
 *     summary: Reject password reset
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Rejected }
 */
userRouter.post(
  "/password-reset-requests/:requestId/reject",
  requirePermission("SETTINGS.USERS.RESET_PASSWORD", workspaceLocator()),
  asyncHandler(userController.rejectResetRequest),
);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: User created successfully
 */
userRouter.post(
  "/",
  requirePermission("SETTINGS.USERS.CREATE", workspaceLocator()),
  enforcePlanLimits("users"),
  asyncHandler(userController.createUser),
);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
userRouter.get(
  "/",
  requirePermission("SETTINGS.USERS.VIEW", workspaceLocator()),
  asyncHandler(userController.getAllUsers),
);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
userRouter.get(
  "/:id",
  requirePermission("SETTINGS.USERS.VIEW", paramLocator("USER", "id")),
  asyncHandler(userController.getUserById),
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
userRouter.put(
  "/:id",
  requirePermission("SETTINGS.USERS.UPDATE", paramLocator("USER", "id")),
  asyncHandler(userController.updateUser),
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
userRouter.delete(
  "/:id",
  requirePermission("SETTINGS.USERS.DELETE", paramLocator("USER", "id")),
  asyncHandler(userController.deleteUser),
);

export default userRouter;
