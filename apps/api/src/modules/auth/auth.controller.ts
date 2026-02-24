import { Request, Response } from "express";
// TODO: move GDPR export/consent/deletion to auth.service + repository
/* eslint-disable-next-line no-restricted-imports */
import { basePrisma } from "@/config/prisma";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { ok, fail } from "@/shared/response";
import { getAuthContext } from "@/shared/auth/getAuthContext";

const REFRESH_TOKEN_TTL_MS = env.jwtRefreshTtlDays * 24 * 60 * 60 * 1000;
import {
  login as loginService,
  refresh as refreshService,
  logout as logoutService,
  logoutAll as logoutAllService,
  getCurrentUser as getCurrentUserService,
} from "./auth.service";

class AuthController {
  private getCookieValue(req: Request, name: string): string | null {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;
    const entry = cookieHeader
      .split("; ")
      .find((cookie) => cookie.startsWith(`${name}=`));
    if (!entry) return null;
    return decodeURIComponent(entry.slice(name.length + 1));
  }

  private cookieOptions(maxAgeMs: number, path = "/"): string {
    const parts = [
      `Path=${path}`,
      `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
      "HttpOnly",
      "SameSite=Strict",
    ];
    if (!env.isDev) parts.push("Secure");
    return parts.join("; ");
  }

  private getClearCookieHeaders(): string[] {
    return [
      `access_token=; ${this.cookieOptions(0)}`,
      `refresh_token=; ${this.cookieOptions(0, "/api/v1/auth")}`,
    ];
  }

  async logIn(req: Request, res: Response) {
    const { username, password } = req.body as {
      username: string;
      password: string;
    };

    if (env.isDev) {
      logger.log("Login attempt", req.requestId, {
        username,
        hasPassword: !!password,
      });
    }

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !password
    ) {
      return fail(res, "Username and password are required", 400);
    }

    const tenantSlug = (req.headers["x-tenant-slug"] as string)?.trim() || null;

    const result = await loginService({
      username,
      password,
      tenantSlug,
      ip: req.ip ?? req.socket?.remoteAddress ?? undefined,
      userAgent: req.get("user-agent") ?? undefined,
    });

    res.setHeader("Set-Cookie", [
      `access_token=${encodeURIComponent(result.token)}; ${this.cookieOptions(4 * 60 * 60 * 1000)}`,
      `refresh_token=${encodeURIComponent(result.refreshToken)}; ${this.cookieOptions(REFRESH_TOKEN_TTL_MS, "/api/v1/auth")}`,
    ]);

    return ok(
      res,
      {
        token: result.token,
        user: result.user,
        tenant: result.tenant,
      },
      200,
    );
  }

  async refreshToken(req: Request, res: Response) {
    const refreshTokenValue =
      (req.body as { refreshToken?: string })?.refreshToken ??
      this.getCookieValue(req, "refresh_token");

    if (!refreshTokenValue) {
      return fail(res, "Refresh token required", 401);
    }

    const result = await refreshService({
      refreshTokenValue,
      ip: req.ip ?? req.socket?.remoteAddress ?? undefined,
      userAgent: req.get("user-agent") ?? undefined,
    });

    res.setHeader("Set-Cookie", [
      `access_token=${encodeURIComponent(result.token)}; ${this.cookieOptions(4 * 60 * 60 * 1000)}`,
      `refresh_token=${encodeURIComponent(result.refreshToken)}; ${this.cookieOptions(REFRESH_TOKEN_TTL_MS, "/api/v1/auth")}`,
    ]);

    return ok(res, { token: result.token, tenant: result.tenant }, 200);
  }

  async getCurrentUser(req: Request, res: Response) {
    const auth = getAuthContext(req);
    if (!auth) return fail(res, "User not authenticated", 401);

    const result = await getCurrentUserService({
      userId: auth.userId,
      tenantId: auth.tenantId,
    });
    return ok(res, result, 200);
  }

  async logOut(req: Request, res: Response) {
    const auth = getAuthContext(req);
    if (!auth) return fail(res, "User not authenticated", 401);

    const refreshTokenValue =
      (req.body as { refreshToken?: string })?.refreshToken ??
      this.getCookieValue(req, "refresh_token");

    const result = await logoutService({
      userId: auth.userId,
      refreshTokenValue,
    });

    res.setHeader("Set-Cookie", this.getClearCookieHeaders());
    return ok(
      res,
      { message: "Logout successful", revokedSessions: result.revokedSessions },
      200,
    );
  }

  async logOutAll(req: Request, res: Response) {
    const auth = getAuthContext(req);
    if (!auth) return fail(res, "User not authenticated", 401);

    const result = await logoutAllService({ userId: auth.userId });

    res.setHeader("Set-Cookie", this.getClearCookieHeaders());
    return ok(
      res,
      {
        message: "All sessions revoked",
        revokedSessions: result.revokedSessions,
      },
      200,
    );
  }

  async exportMyData(req: Request, res: Response) {
    const auth = getAuthContext(req);
    if (!auth) return fail(res, "User not authenticated", 401);

    const user = await basePrisma.user.findUnique({
      where: { id: auth.userId },
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

    if (!user || user.tenantId !== auth.tenantId) {
      return fail(res, "User not found", 404);
    }

    const [auditLogs, activeSessions] = await Promise.all([
      basePrisma.auditLog.findMany({
        where: {
          tenantId: auth.tenantId,
          userId: auth.userId,
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
          userId: auth.userId,
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

    return ok(
      res,
      {
        exportedAt: new Date().toISOString(),
        user,
        auditLogs,
        activeSessions,
      },
      200,
    );
  }

  async updateConsent(req: Request, res: Response) {
    const auth = getAuthContext(req);
    if (!auth) return fail(res, "User not authenticated", 401);

    const consent = req.body as {
      analytics?: boolean;
      marketing?: boolean;
      termsAccepted?: boolean;
    };

    await basePrisma.auditLog.create({
      data: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        action: "GDPR_CONSENT_UPDATED",
        resource: "consent",
        resourceId: auth.userId,
        details: consent,
        ip: req.ip ?? req.socket?.remoteAddress ?? undefined,
        userAgent: req.get("user-agent") ?? undefined,
      },
    });

    return ok(res, { message: "Consent updated" }, 200, "Consent updated");
  }

  async requestAccountDeletion(req: Request, res: Response) {
    const auth = getAuthContext(req);
    if (!auth) return fail(res, "User not authenticated", 401);

    const { reason } = req.body as { reason?: string };

    await basePrisma.auditLog.create({
      data: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        action: "GDPR_DELETION_REQUESTED",
        resource: "user",
        resourceId: auth.userId,
        details: { reason: reason ?? null },
        ip: req.ip ?? req.socket?.remoteAddress ?? undefined,
        userAgent: req.get("user-agent") ?? undefined,
      },
    });

    return ok(
      res,
      { message: "Account deletion request recorded" },
      202,
      "Account deletion request recorded",
    );
  }

  async getWorkspaceInfo(req: Request, res: Response) {
    const slug = req.params.slug?.trim().toLowerCase();
    if (!slug) {
      return fail(res, "Workspace slug is required", 400);
    }

    const tenant = await basePrisma.tenant.findUnique({
      where: { slug },
      select: { slug: true, name: true, isActive: true },
    });

    if (!tenant || !tenant.isActive) {
      return fail(res, "Organization not found", 404);
    }

    return ok(
      res,
      {
        workspace: { slug: tenant.slug, name: tenant.name },
      },
      200,
    );
  }
}

export default new AuthController();
