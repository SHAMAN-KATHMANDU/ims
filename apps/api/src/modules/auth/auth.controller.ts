import { Request, Response } from "express";
import { basePrisma } from "@/config/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { sendControllerError } from "@/utils/controllerError";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

class AuthController {
  private hashRefreshToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
  }

  private createRawRefreshToken(): string {
    return crypto.randomBytes(48).toString("hex");
  }

  private createAccessToken(payload: Record<string, unknown>): string {
    return jwt.sign(payload, env.jwtSecret, {
      expiresIn: ACCESS_TOKEN_TTL,
    });
  }

  async logIn(req: Request, res: Response) {
    try {
      const { username, password } = req.body as {
        username: string;
        password: string;
      };

      // Debug logs only in development
      if (env.isDev) {
        logger.log("Login attempt", req.requestId, {
          username,
          hasPassword: !!password,
        });
      }

      // Keep a controller-level safety guard because tests call controller directly.
      if (
        typeof username !== "string" ||
        typeof password !== "string" ||
        !username.trim() ||
        !password
      ) {
        return res
          .status(400)
          .json({ message: "Username and password are required" });
      }

      // Normalize username - trim and handle case
      const normalizedUsername = username.toLowerCase().trim();

      // ----- Tenant resolution for login -----
      // Resolve tenant from X-Tenant-Slug header
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
        return res.status(500).json({
          message: "No tenant configured. Please contact support.",
        });
      }

      // Find user within this tenant (username is unique per tenant)
      let user = await basePrisma.user.findFirst({
        where: {
          tenantId: tenant.id,
          username: normalizedUsername,
        },
      });

      if (!user) {
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }

      // Account lockout: reject if currently locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return res.status(429).json({
          message:
            "Account temporarily locked due to too many failed attempts. Try again later.",
        });
      }

      // Verify the password
      const isMatch = await bcrypt.compare(password.toString(), user.password);

      if (!isMatch) {
        const attempts = user.failedLoginAttempts + 1;
        const lockData: { failedLoginAttempts: number; lockedUntil?: Date } = {
          failedLoginAttempts: attempts,
        };
        if (attempts >= 5) {
          lockData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        }
        await basePrisma.user.update({
          where: { id: user.id },
          data: lockData,
        });
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }

      // Update lastLoginAt, reset lock, and record audit log (LOGIN)
      const now = new Date();
      const refreshToken = this.createRawRefreshToken();
      const refreshTokenHash = this.hashRefreshToken(refreshToken);
      const refreshExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

      const refreshSession = await basePrisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: now,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });
        await tx.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: "LOGIN",
            resource: "auth",
            resourceId: user.id,
            details: { username: user.username, tenantSlug: tenant.slug },
            ip: req.ip ?? req.socket?.remoteAddress ?? undefined,
            userAgent: req.get("user-agent") ?? undefined,
          },
        });

        return tx.refreshToken.create({
          data: {
            userId: user.id,
            tenantId: user.tenantId,
            tokenHash: refreshTokenHash,
            expiresAt: refreshExpiresAt,
            createdByIp: req.ip ?? req.socket?.remoteAddress ?? null,
            userAgent: req.get("user-agent") ?? null,
          },
        });
      });

      // Generate short-lived access token
      const tokenPayload: Record<string, any> = {
        id: user.id,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
        tenantSlug: tenant.slug,
        sessionId: refreshSession.id,
      };

      const token = this.createAccessToken(tokenPayload);

      // Return user and tenant only; set HttpOnly cookies for tokens
      const { password: _, ...userWithoutPassword } = user;

      const isSecure = !env.isDev;
      const cookieOpts = (maxAgeMs: number, path = "/"): string => {
        const parts = [
          `Path=${path}`,
          `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
          "HttpOnly",
          "SameSite=Strict",
        ];
        if (isSecure) parts.push("Secure");
        return parts.join("; ");
      };

      res.setHeader("Set-Cookie", [
        `access_token=${token}; ${cookieOpts(15 * 60 * 1000)}`,
        `refresh_token=${refreshToken}; ${cookieOpts(REFRESH_TOKEN_TTL_MS, "/api/v1/auth")}`,
      ]);

      res.status(200).json({
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

  async refreshToken(req: Request, res: Response) {
    try {
      const refreshTokenValue =
        (req.body as { refreshToken?: string })?.refreshToken ||
        req.headers.cookie
          ?.split("; ")
          .find((c) => c.startsWith("refresh_token="))
          ?.split("=")[1];

      if (!refreshTokenValue) {
        return res.status(401).json({ message: "Refresh token required" });
      }

      const tokenHash = this.hashRefreshToken(refreshTokenValue);
      const now = new Date();

      const currentSession = await basePrisma.refreshToken.findFirst({
        where: {
          tokenHash,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        include: {
          user: true,
          tenant: {
            select: {
              id: true,
              slug: true,
              name: true,
              plan: true,
              subscriptionStatus: true,
              planExpiresAt: true,
              trialEndsAt: true,
              isActive: true,
            },
          },
        },
      });

      if (!currentSession?.user || !currentSession.tenant) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      if (!currentSession.tenant.isActive) {
        return res
          .status(403)
          .json({ message: "This organization has been deactivated" });
      }

      const nextRefreshToken = this.createRawRefreshToken();
      const nextRefreshTokenHash = this.hashRefreshToken(nextRefreshToken);
      const nextRefreshExpiresAt = new Date(
        now.getTime() + REFRESH_TOKEN_TTL_MS,
      );

      const nextSession = await basePrisma.$transaction(async (tx) => {
        const created = await tx.refreshToken.create({
          data: {
            userId: currentSession.user.id,
            tenantId: currentSession.user.tenantId,
            tokenHash: nextRefreshTokenHash,
            expiresAt: nextRefreshExpiresAt,
            createdByIp: req.ip ?? req.socket?.remoteAddress ?? null,
            userAgent: req.get("user-agent") ?? null,
          },
        });

        await tx.refreshToken.update({
          where: { id: currentSession.id },
          data: {
            revokedAt: now,
            replacedById: created.id,
          },
        });

        return created;
      });

      const accessToken = this.createAccessToken({
        id: currentSession.user.id,
        username: currentSession.user.username,
        role: currentSession.user.role,
        tenantId: currentSession.user.tenantId,
        tenantSlug: currentSession.tenant.slug,
        sessionId: nextSession.id,
      });

      const isSecure = !env.isDev;
      const cookieOpts = (maxAgeMs: number, path = "/"): string => {
        const parts = [
          `Path=${path}`,
          `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
          "HttpOnly",
          "SameSite=Strict",
        ];
        if (isSecure) parts.push("Secure");
        return parts.join("; ");
      };

      res.setHeader("Set-Cookie", [
        `access_token=${accessToken}; ${cookieOpts(15 * 60 * 1000)}`,
        `refresh_token=${nextRefreshToken}; ${cookieOpts(REFRESH_TOKEN_TTL_MS, "/api/v1/auth")}`,
      ]);

      return res.status(200).json({
        tenant: {
          id: currentSession.tenant.id,
          slug: currentSession.tenant.slug,
          name: currentSession.tenant.name,
          plan: currentSession.tenant.plan,
          subscriptionStatus: currentSession.tenant.subscriptionStatus,
          planExpiresAt: currentSession.tenant.planExpiresAt,
          trialEndsAt: currentSession.tenant.trialEndsAt,
        },
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Refresh token error");
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
        return res
          .status(401)
          .json({ message: "User not found or session invalid" });
      }
      if (user.tenantId !== req.user.tenantId) {
        return res
          .status(401)
          .json({ message: "User not found or session invalid" });
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
      if (!req.user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const refreshToken = (req.body as { refreshToken?: string })
        ?.refreshToken;
      const now = new Date();

      if (refreshToken) {
        const refreshTokenHash = this.hashRefreshToken(refreshToken);
        const result = await basePrisma.refreshToken.updateMany({
          where: {
            tokenHash: refreshTokenHash,
            userId: req.user.id,
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });

        res.setHeader("Set-Cookie", [
          "access_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict",
          "refresh_token=; Path=/api/v1/auth; Max-Age=0; HttpOnly; SameSite=Strict",
        ]);
        return res.status(200).json({
          message: "Logout successful",
          revokedSessions: result.count,
        });
      }

      const result = await basePrisma.refreshToken.updateMany({
        where: {
          userId: req.user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      res.setHeader("Set-Cookie", [
        "access_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict",
        "refresh_token=; Path=/api/v1/auth; Max-Age=0; HttpOnly; SameSite=Strict",
      ]);
      return res.status(200).json({
        message: "Logout successful",
        revokedSessions: result.count,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Logout error");
    }
  }

  async logOutAll(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const result = await basePrisma.refreshToken.updateMany({
        where: {
          userId: req.user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      res.setHeader("Set-Cookie", [
        "access_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict",
        "refresh_token=; Path=/api/v1/auth; Max-Age=0; HttpOnly; SameSite=Strict",
      ]);
      return res.status(200).json({
        message: "All sessions revoked",
        revokedSessions: result.count,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Logout all error");
    }
  }

  async exportMyData(req: Request, res: Response) {
    try {
      if (!req.user?.id || !req.user.tenantId) {
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
          lastLoginAt: true,
        },
      });

      if (!user || user.tenantId !== req.user.tenantId) {
        return res.status(404).json({ message: "User not found" });
      }

      const [auditLogs, activeSessions] = await Promise.all([
        basePrisma.auditLog.findMany({
          where: {
            tenantId: req.user.tenantId,
            userId: req.user.id,
          },
          orderBy: { createdAt: "desc" },
          take: 200,
          select: {
            id: true,
            action: true,
            resource: true,
            resourceId: true,
            details: true,
            createdAt: true,
          },
        }),
        basePrisma.refreshToken.findMany({
          where: {
            userId: req.user.id,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          select: {
            id: true,
            expiresAt: true,
            createdAt: true,
            userAgent: true,
            createdByIp: true,
          },
        }),
      ]);

      return res.status(200).json({
        exportedAt: new Date().toISOString(),
        user,
        auditLogs,
        activeSessions,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Data export error");
    }
  }

  async updateConsent(req: Request, res: Response) {
    try {
      if (!req.user?.id || !req.user.tenantId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const consent = req.body as {
        analytics?: boolean;
        marketing?: boolean;
        termsAccepted?: boolean;
      };

      await basePrisma.auditLog.create({
        data: {
          tenantId: req.user.tenantId,
          userId: req.user.id,
          action: "GDPR_CONSENT_UPDATED",
          resource: "consent",
          resourceId: req.user.id,
          details: consent,
          ip: req.ip ?? req.socket?.remoteAddress ?? undefined,
          userAgent: req.get("user-agent") ?? undefined,
        },
      });

      return res.status(200).json({ message: "Consent updated" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Consent update error");
    }
  }

  async requestAccountDeletion(req: Request, res: Response) {
    try {
      if (!req.user?.id || !req.user.tenantId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { reason } = req.body as { reason?: string };

      await basePrisma.auditLog.create({
        data: {
          tenantId: req.user.tenantId,
          userId: req.user.id,
          action: "GDPR_DELETION_REQUESTED",
          resource: "user",
          resourceId: req.user.id,
          details: { reason: reason ?? null },
          ip: req.ip ?? req.socket?.remoteAddress ?? undefined,
          userAgent: req.get("user-agent") ?? undefined,
        },
      });

      return res.status(202).json({
        message: "Account deletion request recorded",
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Deletion request error");
    }
  }
}

export default new AuthController();
