import { Request, Response } from "express";
import { basePrisma } from "@/config/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { sendControllerError } from "@/utils/controllerError";

class AuthController {
  async logIn(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      // Debug logs only in development
      if (env.isDev) {
        logger.log("Login attempt", req.requestId, {
          username,
          hasPassword: !!password,
        });
      }

      // Normalize username - trim and handle case
      const normalizedUsername = username?.toString().toLowerCase().trim();

      if (!normalizedUsername || !password) {
        return res
          .status(400)
          .json({ message: "Username and password are required" });
      }

      // ----- Tenant resolution for login -----
      // Resolve tenant from X-Tenant-Slug header, or fall back to default tenant
      const tenantSlug =
        (req.headers["x-tenant-slug"] as string)?.trim() || null;

      let tenant;
      if (tenantSlug) {
        tenant = await basePrisma.tenant.findUnique({
          where: { slug: tenantSlug },
        });
        if (!tenant) {
          return res.status(404).json({ message: "Organization not found" });
        }
        if (!tenant.isActive) {
          return res
            .status(403)
            .json({ message: "This organization has been deactivated" });
        }
      } else {
        // In development or when no tenant header is provided, use the default tenant
        tenant = await basePrisma.tenant.findFirst({
          where: { slug: "default" },
        });
        if (!tenant) {
          // Fallback: use the first active tenant
          tenant = await basePrisma.tenant.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
          });
        }
        if (!tenant) {
          return res.status(500).json({
            message:
              "No tenant configured. Please run the seed to set up the system.",
          });
        }
      }

      // Find user within this tenant (username is unique per tenant)
      let user = await basePrisma.user.findFirst({
        where: {
          tenantId: tenant.id,
          username: normalizedUsername,
        },
      });

      // If not found, try original username (in case it's stored with different case)
      if (!user && username !== normalizedUsername) {
        user = await basePrisma.user.findFirst({
          where: {
            tenantId: tenant.id,
            username: username.toString().trim(),
          },
        });
      }

      // Also check platform admins (they have no tenant scope)
      if (!user) {
        user = await basePrisma.user.findFirst({
          where: {
            username: normalizedUsername,
            role: "platformAdmin",
          },
        });
      }

      if (!user) {
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }

      // Verify the password
      const isMatch = await bcrypt.compare(password.toString(), user.password);

      if (!isMatch) {
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }

      // Update lastLoginAt and record audit log (LOGIN)
      const now = new Date();
      await basePrisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: now },
      });
      await basePrisma.auditLog.create({
        data: {
          tenantId: user.role === "platformAdmin" ? null : user.tenantId,
          userId: user.id,
          action: "LOGIN",
          resource: "auth",
          resourceId: user.id,
          details: { username: user.username, tenantSlug: tenant.slug },
          ip: req.ip ?? req.socket?.remoteAddress ?? undefined,
          userAgent: req.get("user-agent") ?? undefined,
        },
      });

      // Generate JWT token — includes tenantId and tenantSlug
      const tokenPayload: Record<string, any> = {
        id: user.id,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
        tenantSlug: tenant.slug,
      };

      const token = jwt.sign(tokenPayload, env.jwtSecret, {
        expiresIn: "24h",
      });

      // Return token, user info (without password), and tenant info
      const { password: _, ...userWithoutPassword } = user;

      res.status(200).json({
        token,
        user: userWithoutPassword,
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          plan: tenant.plan,
          subscriptionStatus: tenant.subscriptionStatus,
          planExpiresAt: tenant.planExpiresAt,
          trialEndsAt: tenant.trialEndsAt,
        },
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Login error");
    }
  }

  async getCurrentUser(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await basePrisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          tenantId: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Also fetch fresh tenant info
      const tenant = await basePrisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: {
          id: true,
          slug: true,
          name: true,
          plan: true,
          subscriptionStatus: true,
          planExpiresAt: true,
          trialEndsAt: true,
        },
      });

      res.status(200).json({ user, tenant });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get current user error");
    }
  }

  async logOut(req: Request, res: Response) {
    try {
      // Since JWT is stateless, logout is handled on frontend by removing token
      // This endpoint just confirms the token was valid
      res.status(200).json({ message: "Logout successful" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Logout error");
    }
  }
}

export default new AuthController();
