import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanLimits } from "@/middlewares/enforcePlanLimits";
import userController from "@/modules/users/user.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const userRouter = Router();

/**
 * @swagger
 * /users/password-reset-requests:
 *   get:
 *     summary: Get password reset requests (superAdmin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Password reset requests for tenant
 */
userRouter.get(
  "/password-reset-requests",
  authorizeRoles("superAdmin"),
  asyncHandler(userController.getPasswordResetRequests),
);

/**
 * @swagger
 * /users/password-reset-requests/{requestId}/approve:
 *   post:
 *     summary: Approve password reset (superAdmin only)
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
  authorizeRoles("superAdmin"),
  asyncHandler(userController.approveResetRequest),
);

/**
 * @swagger
 * /users/password-reset-requests/{requestId}/escalate:
 *   post:
 *     summary: Escalate password reset to platform admin (superAdmin only)
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
  authorizeRoles("superAdmin"),
  asyncHandler(userController.escalateResetRequest),
);

/**
 * @swagger
 * /users/password-reset-requests/{requestId}/reject:
 *   post:
 *     summary: Reject password reset (superAdmin only)
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
  authorizeRoles("superAdmin"),
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *                 example: newuser
 *               password:
 *                 type: string
 *                 example: password123
 *               role:
 *                 type: string
 *                 enum: [superAdmin, admin, user]
 *                 example: admin
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/UserPublic'
 *       400:
 *         description: Bad request or validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - SuperAdmin role required
 *       409:
 *         description: User with this username already exists
 */
userRouter.post(
  "/",
  authorizeRoles("superAdmin"),
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
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedUsersResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin or SuperAdmin role required
 */
userRouter.get(
  "/",
  authorizeRoles("superAdmin", "admin"),
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/UserPublic'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - SuperAdmin role required
 *       404:
 *         description: User not found
 */
userRouter.get(
  "/:id",
  authorizeRoles("superAdmin"),
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [superAdmin, admin, user]
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/UserPublic'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - SuperAdmin role required
 *       404:
 *         description: User not found
 *       409:
 *         description: Username already exists
 */
userRouter.put(
  "/:id",
  authorizeRoles("superAdmin"),
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - SuperAdmin role required
 *       404:
 *         description: User not found
 */
userRouter.delete(
  "/:id",
  authorizeRoles("superAdmin"),
  asyncHandler(userController.deleteUser),
);

export default userRouter;
