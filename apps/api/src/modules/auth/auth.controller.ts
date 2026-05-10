import { Request, Response } from "express";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { sendControllerError } from "@/utils/controllerError";
import type { AppError } from "@/middlewares/errorHandler";
import {
  LoginSchema,
  ForgotPasswordSchema,
  ChangePasswordSchema,
  RefreshTokenBodySchema,
} from "./auth.schema";
import authService, { AuthService } from "./auth.service";

class AuthController {
  constructor(private service: AuthService) {}

  getOrgName = async (req: Request, res: Response) => {
    try {
      const slug = (req.query.slug as string)?.trim()?.toLowerCase();
      if (!slug) {
        return res.status(400).json({ message: "Slug is required" });
      }
      const result = await this.service.getOrgNameBySlug(slug);
      if (!result) {
        return res.status(404).json({ message: "Organization not found" });
      }
      return res.status(200).json(result);
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get org name error");
    }
  };

  logIn = async (req: Request, res: Response) => {
    try {
      const tenantSlug =
        (req.headers["x-tenant-slug"] as string)?.trim() || null;
      if (!tenantSlug) {
        return res.status(500).json({
          message: "No tenant configured. Please contact support.",
        });
      }

      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Username and password are required",
        });
      }

      const { username, password } = parsed.data;

      if (env.isDev) {
        logger.log("Login attempt", (req as any).requestId, {
          username,
          hasPassword: !!password,
        });
      }

      const result = await this.service.login({
        username,
        password,
        tenantSlug,
        ip: req.ip ?? (req.socket as any)?.remoteAddress ?? undefined,
        userAgent: req.get("user-agent") ?? undefined,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (typeof appErr.statusCode === "number") {
        return res.status(appErr.statusCode).json({
          message: appErr.message,
        });
      }
      return sendControllerError(req, res, error, "Login error");
    }
  };

  getCurrentUser = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { user, tenant } = await this.service.getMe(req.user.id);
      return res.status(200).json({ user, tenant });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (typeof appErr.statusCode === "number") {
        return res.status(appErr.statusCode).json({
          message: appErr.message,
        });
      }
      return sendControllerError(req, res, error, "Get current user error");
    }
  };

  refresh = async (req: Request, res: Response) => {
    try {
      const parsed = RefreshTokenBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "refreshToken is required" });
      }

      const result = await this.service.refreshAccessToken(
        parsed.data.refreshToken,
      );
      return res.status(200).json(result);
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (typeof appErr.statusCode === "number") {
        return res.status(appErr.statusCode).json({
          message: appErr.message,
        });
      }
      return sendControllerError(req, res, error, "Refresh token error");
    }
  };

  logOut = async (req: Request, res: Response) => {
    try {
      return res.status(200).json({ message: "Logout successful" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Logout error");
    }
  };

  forgotPassword = async (req: Request, res: Response) => {
    try {
      const tenantSlug =
        (req.headers["x-tenant-slug"] as string)?.trim() || null;
      if (!tenantSlug) {
        return res.status(400).json({
          message: "No tenant configured. Provide X-Tenant-Slug header.",
        });
      }

      const parsed = ForgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Username is required",
        });
      }

      const result = await this.service.requestPasswordReset(
        tenantSlug,
        parsed.data,
      );
      return res.status(200).json(result);
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (typeof appErr.statusCode === "number") {
        return res.status(appErr.statusCode).json({
          message: appErr.message,
        });
      }
      return sendControllerError(req, res, error, "Forgot password error");
    }
  };

  changePassword = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const requestId = (req as any).requestId;
      const parsed = ChangePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        logger.warn("Change password validation failed", requestId, {
          userId: req.user.id,
          tenantId: req.user.tenantId,
          errors: parsed.error.flatten(),
        });
        return res.status(400).json({
          message: parsed.error.flatten().fieldErrors,
        });
      }

      const { currentPassword, newPassword } = parsed.data;

      const user = await this.service.changePassword(
        req.user.id,
        currentPassword,
        newPassword,
      );

      // Audit log for successful password change
      try {
        await this.service.createPasswordChangeAuditLog({
          userId: req.user.id,
          tenantId: req.user.tenantId,
          ip: req.ip ?? (req.socket as any)?.remoteAddress ?? undefined,
          userAgent: req.get("user-agent") ?? undefined,
        });
      } catch (auditError) {
        // Audit log failure is non-fatal
        logger.error("Failed to log password change audit", requestId, {
          userId: req.user.id,
          error: auditError,
        });
      }

      logger.info("Password changed successfully", requestId, {
        userId: req.user.id,
        tenantId: req.user.tenantId,
      });

      return res.status(200).json({
        message: "Password changed successfully",
        user: {
          id: user.id,
          username: user.username,
          tenantId: user.tenantId,
        },
      });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (typeof appErr.statusCode === "number") {
        return res.status(appErr.statusCode).json({
          message: appErr.message,
        });
      }
      return sendControllerError(req, res, error, "Change password error");
    }
  };
}

export default new AuthController(authService);
