import { Router } from "express";
import authController from "@/modules/auth/auth.controller";
import verifyToken from "@/middlewares/authMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";

const authRouter = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     parameters:
 *       - in: header
 *         name: X-Tenant-Slug
 *         required: true
 *         schema:
 *           type: string
 *           example: demo
 *         description: Tenant slug (e.g. demo, acme). Identifies which organization to authenticate against.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: superadmin
 *               password:
 *                 type: string
 *                 example: superadmin123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 tenant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     slug:
 *                       type: string
 *                     name:
 *                       type: string
 *       400:
 *         description: Username and password required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: No tenant configured. Please contact support. (Missing X-Tenant-Slug header)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /auth/org-name:
 *   get:
 *     summary: Get organization name by slug (public, for login page)
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant slug (e.g. demo, acme)
 *     responses:
 *       200:
 *         description: Organization name
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *       404:
 *         description: Organization not found
 */
authRouter.get("/org-name", asyncHandler(authController.getOrgName));

authRouter.post("/login", asyncHandler(authController.logIn));

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     parameters:
 *       - in: header
 *         name: X-Tenant-Slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant slug
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request submitted
 *       400:
 *         description: Validation error
 */
authRouter.post(
  "/forgot-password",
  asyncHandler(authController.forgotPassword),
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
authRouter.get("/me", verifyToken, asyncHandler(authController.getCurrentUser));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
authRouter.post("/logout", verifyToken, asyncHandler(authController.logOut));

export default authRouter;
