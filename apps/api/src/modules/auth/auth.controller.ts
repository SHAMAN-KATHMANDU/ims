import { Request, Response } from "express";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { sendControllerError } from "@/utils/controllerError";
import type { AppError } from "@/middlewares/errorHandler";
import { LoginSchema, ForgotPasswordSchema } from "./auth.schema";
import authService, { AuthService } from "./auth.service";

class AuthController {
  constructor(private service: AuthService) {}

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
}

export default new AuthController(authService);
