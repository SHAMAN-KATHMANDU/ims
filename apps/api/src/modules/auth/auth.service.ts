import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "@/config/env";
import { createError } from "@/middlewares/errorHandler";
import authRepository, { AuthRepository } from "./auth.repository";
import {
  RefreshTokenPayloadSchema,
  type ForgotPasswordDto,
} from "./auth.schema";

export interface LoginParams {
  username: string;
  password: string;
  tenantSlug: string;
  ip?: string;
  userAgent?: string;
}

export interface RefreshResult {
  token: string;
  refreshToken: string;
}

export interface LoginResult {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    tenantId: string;
    username: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  tenant: {
    id: string;
    slug: string;
    name: string;
    plan: string | null;
    subscriptionStatus: string | null;
    planExpiresAt: Date | null;
    trialEndsAt: Date | null;
    /**
     * Per-tenant website feature flag. Platform admins flip this via
     * /platform/tenants/:id/website/{enable|disable}. Default false for
     * every new tenant — the website settings UI stays hidden until a
     * platform admin turns it on.
     */
    websiteEnabled: boolean;
  };
}

function signAccessToken(payload: {
  id: string;
  username: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
}): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtAccessTokenTtl as SignOptions["expiresIn"],
  });
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ id: userId, type: "refresh" }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshTokenTtl as SignOptions["expiresIn"],
  });
}

export class AuthService {
  constructor(private repo: AuthRepository) {}

  /**
   * Verify a refresh token and mint a fresh access + refresh token pair.
   * Refresh tokens rotate on every use so a leaked token has a bounded window.
   * Throws 401 when the token is missing/expired/wrong-type, or when the user
   * no longer exists in the database.
   */
  async refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
    let decoded: unknown;
    try {
      decoded = jwt.verify(refreshToken, env.jwtRefreshSecret);
    } catch {
      throw createError("Invalid or expired refresh token", 401);
    }

    const parsed = RefreshTokenPayloadSchema.safeParse(decoded);
    if (!parsed.success) {
      throw createError("Invalid refresh token", 401);
    }

    const user = await this.repo.findUserById(parsed.data.id);
    if (!user) {
      throw createError("User no longer exists", 401);
    }

    const tenant = await this.repo.findTenantById(user.tenantId);
    if (!tenant) {
      throw createError("Tenant not found", 401);
    }

    const token = signAccessToken({
      id: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: tenant.slug,
    });

    return { token, refreshToken: signRefreshToken(user.id) };
  }

  async login(params: LoginParams): Promise<LoginResult> {
    const { username, password, tenantSlug, ip, userAgent } = params;

    const tenant = await this.repo.findTenantBySlug(tenantSlug);
    if (!tenant) {
      throw createError("Organization not found", 404);
    }
    if (!tenant.isActive) {
      throw createError("This organization has been deactivated", 403);
    }

    const user = await this.repo.findUserByTenantAndUsername(
      tenant.id,
      username,
    );
    if (!user) {
      throw createError("Invalid username or password", 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw createError("Invalid username or password", 401);
    }

    const now = new Date();
    await this.repo.updateUserLastLogin(user.id, now);
    await this.repo.createAuditLog({
      tenantId: user.tenantId,
      userId: user.id,
      action: "LOGIN",
      resource: "auth",
      resourceId: user.id,
      details: { username: user.username, tenantSlug: tenant.slug },
      ip,
      userAgent,
    });

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: tenant.slug,
    };

    const token = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(user.id);

    const { password: _p, ...userWithoutPassword } = user;

    return {
      token,
      refreshToken,
      user: userWithoutPassword,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
        subscriptionStatus: tenant.subscriptionStatus,
        planExpiresAt: tenant.planExpiresAt,
        trialEndsAt: tenant.trialEndsAt,
        websiteEnabled: tenant.siteConfig?.websiteEnabled === true,
      },
    };
  }

  /** Get org name by slug only (public, for login page). Returns { name } or null. */
  async getOrgNameBySlug(slug: string): Promise<{ name: string } | null> {
    return this.repo.findOrgNameBySlug(slug.trim().toLowerCase());
  }

  async getMe(userId: string) {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw createError("User not found or session invalid", 401);
    }

    const tenant = await this.repo.findTenantById(user.tenantId);
    if (!tenant) {
      throw createError("Tenant not found", 404);
    }

    // Flatten the join so the wire shape matches the login response.
    const { siteConfig, ...tenantRest } = tenant;
    return {
      user,
      tenant: {
        ...tenantRest,
        websiteEnabled: siteConfig?.websiteEnabled === true,
      },
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.repo.findUserWithPassword(userId);
    if (!user) {
      throw createError("User not found", 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw createError("Current password is incorrect", 401);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    return this.repo.updateUserPassword(userId, hashedPassword);
  }

  async requestPasswordReset(
    tenantSlug: string,
    data: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const tenant = await this.repo.findTenantBySlug(tenantSlug);
    if (!tenant) {
      throw createError("Organization not found", 404);
    }
    if (!tenant.isActive) {
      throw createError("This organization has been deactivated", 403);
    }

    const user = await this.repo.findUserByTenantAndUsername(
      tenant.id,
      data.username,
    );
    if (!user) {
      // Do not reveal whether user exists
      return {
        message:
          "If an account exists with this username, a password reset request has been submitted. Contact your administrator.",
      };
    }

    const escalated = user.role === "superAdmin";
    await this.repo.createPasswordResetRequest({
      tenantId: tenant.id,
      requestedById: user.id,
      escalated,
    });

    return {
      message:
        "If an account exists with this username, a password reset request has been submitted. Contact your administrator.",
    };
  }

  async createPasswordChangeAuditLog(params: {
    userId: string;
    tenantId: string;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.repo.createAuditLog({
      tenantId: params.tenantId,
      userId: params.userId,
      action: "SECURITY",
      resource: "password",
      resourceId: params.userId,
      details: { action: "password_changed" },
      ip: params.ip,
      userAgent: params.userAgent,
    });
  }
}

export default new AuthService(authRepository);
