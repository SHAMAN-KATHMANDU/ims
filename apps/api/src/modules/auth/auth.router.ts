import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import authController from "@/modules/auth/auth.controller";
import verifyToken from "@/middlewares/authMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";

/**
 * Rate limiter for password change attempts.
 * Limits to 5 attempts per 15 minutes per authenticated user.
 */
const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  keyGenerator: (req: any) => {
    // Rate limit by user ID when authenticated; fall back to IP via the
    // express-rate-limit helper that handles IPv6 normalization (required
    // by the lib's runtime validator — bare req.ip throws ERR_ERL_KEY_GEN_IPV6).
    return req.user?.id ?? ipKeyGenerator(req.ip ?? "unknown");
  },
  standardHeaders: false, // Don't send rate limit headers
  skip: (req: any) => !req.user, // Skip if not authenticated
});

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
 *                   description: Short-lived JWT access token (default 15m).
 *                 refreshToken:
 *                   type: string
 *                   description: Long-lived JWT refresh token (default 30d). POST to /auth/refresh to mint a new access token.
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
 * /auth/refresh:
 *   post:
 *     summary: Exchange a refresh token for a fresh access + refresh token pair
 *     description: |
 *       Verifies the supplied refresh token (signed with JWT_REFRESH_SECRET) and,
 *       if valid and the user still exists, returns a new short-lived access
 *       token plus a rotated refresh token. The previous refresh token is not
 *       revoked server-side (stateless), so the client must always replace it
 *       with the rotated one. Does NOT require Authorization header.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New token pair
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: refreshToken missing in body
 *       401:
 *         description: Refresh token is missing, expired, malformed, or user no longer exists
 */
authRouter.post("/refresh", asyncHandler(authController.refresh));

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

/**
 * @swagger
 * /auth/me/password:
 *   post:
 *     summary: Change user password
 *     description: Allows authenticated users to change their password. Requires current password for verification.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password (for verification)
 *                 minLength: 1
 *               newPassword:
 *                 type: string
 *                 description: New password (must be at least 8 characters)
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     tenantId:
 *                       type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Current password is incorrect or user not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many password change attempts
 *       500:
 *         description: Server error
 */
authRouter.post(
  "/me/password",
  verifyToken,
  changePasswordLimiter,
  asyncHandler(authController.changePassword),
);

export default authRouter;
