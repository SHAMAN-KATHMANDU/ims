import { Router } from "express";
import rateLimit from "express-rate-limit";
import authController from "@/modules/auth/auth.controller";
import verifyToken from "@/middlewares/authMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";
import { validateBody } from "@/middlewares/validateRequest";
import {
  consentSchema,
  deletionRequestSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
} from "@/modules/auth/auth.schema";

const authRouter = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
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
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
authRouter.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(authController.logIn.bind(authController)),
);

authRouter.get(
  "/workspace/:slug",
  asyncHandler(authController.getWorkspaceInfo.bind(authController)),
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
 */
authRouter.get(
  "/me",
  verifyToken,
  asyncHandler(authController.getCurrentUser.bind(authController)),
);

authRouter.post(
  "/refresh",
  validateBody(refreshTokenSchema),
  asyncHandler(authController.refreshToken.bind(authController)),
);

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
 */
authRouter.post(
  "/logout",
  verifyToken,
  validateBody(logoutSchema),
  asyncHandler(authController.logOut.bind(authController)),
);

authRouter.post(
  "/logout-all",
  verifyToken,
  asyncHandler(authController.logOutAll.bind(authController)),
);

authRouter.get(
  "/data-export",
  verifyToken,
  asyncHandler(authController.exportMyData.bind(authController)),
);

authRouter.post(
  "/consent",
  verifyToken,
  validateBody(consentSchema),
  asyncHandler(authController.updateConsent.bind(authController)),
);

authRouter.post(
  "/account-deletion-request",
  verifyToken,
  validateBody(deletionRequestSchema),
  asyncHandler(authController.requestAccountDeletion.bind(authController)),
);

export default authRouter;
