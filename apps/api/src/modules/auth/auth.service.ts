/**
 * Auth service - business logic for auth module.
 * Uses auth.repository. Framework-independent.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "@/config/env";
import { AppError, NotFoundError } from "@/shared/errors";
import { AuditAction, AuditResource } from "@/shared/types";
import { authRepository } from "./auth.repository";
import { basePrisma } from "@/config/prisma";

const ACCESS_TOKEN_TTL = env.jwtAccessExpiresIn;
const REFRESH_TOKEN_TTL_MS = env.jwtRefreshTtlDays * 24 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function hashRefreshToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function createRawRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

function createAccessToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
  });
}

export type LoginParams = {
  username: string;
  password: string;
  tenantSlug: string | null;
  ip?: string;
  userAgent?: string;
};

export type LoginResult = {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    tenantId: string;
    username: string;
    role: string;
    [key: string]: unknown;
  };
  tenant: {
    id: string;
    slug: string;
    name: string;
    plan?: string;
    subscriptionStatus?: string;
    planExpiresAt?: Date | null;
    trialEndsAt?: Date | null;
  };
};

export async function login(params: LoginParams): Promise<LoginResult> {
  if (!params.tenantSlug) {
    throw new AppError("No tenant configured. Please contact support.", 500);
  }

  const tenant = await authRepository.findTenantBySlug(params.tenantSlug);
  if (!tenant) throw new NotFoundError("Organization not found");
  if (!tenant.isActive) {
    throw new AppError("This organization has been deactivated", 403);
  }

  const normalizedUsername = params.username.toLowerCase().trim();
  const user = await authRepository.findUserByUsernameAndTenant(
    tenant.id,
    normalizedUsername,
  );

  if (!user) {
    throw new AppError("Invalid username or password", 401);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(
      "Account temporarily locked due to too many failed attempts. Try again later.",
      429,
    );
  }

  const isMatch = await bcrypt.compare(
    params.password.toString(),
    user.password,
  );

  if (!isMatch) {
    const attempts = user.failedLoginAttempts + 1;
    const lockData: { failedLoginAttempts: number; lockedUntil?: Date | null } =
      {
        failedLoginAttempts: attempts,
      };
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      lockData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
    await authRepository.updateUserLockData(user.id, lockData);
    throw new AppError("Invalid username or password", 401);
  }

  const now = new Date();
  const refreshToken = createRawRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
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
        action: AuditAction.LOGIN,
        resource: AuditResource.AUTH,
        resourceId: user.id,
        details: { username: user.username, tenantSlug: tenant.slug },
        ip: params.ip,
        userAgent: params.userAgent,
      },
    });
    return tx.refreshToken.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        tokenHash: refreshTokenHash,
        expiresAt: refreshExpiresAt,
        createdByIp: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  });

  const tokenPayload: Record<string, unknown> = {
    id: user.id,
    username: user.username,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug: tenant.slug,
    sessionId: refreshSession.id,
  };
  const token = createAccessToken(tokenPayload);

  const { password: _p, ...userWithoutPassword } = user;

  return {
    token,
    refreshToken,
    user: userWithoutPassword as LoginResult["user"],
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      subscriptionStatus: tenant.subscriptionStatus,
      planExpiresAt: tenant.planExpiresAt,
      trialEndsAt: tenant.trialEndsAt,
    },
  };
}

export type RefreshParams = {
  refreshTokenValue: string;
  ip?: string;
  userAgent?: string;
};

export type RefreshResult = {
  token: string;
  refreshToken: string;
  user: { id: string; username: string; role: string; tenantId: string };
  tenant: {
    id: string;
    slug: string;
    name: string;
    plan?: string;
    subscriptionStatus?: string;
    planExpiresAt?: Date | null;
    trialEndsAt?: Date | null;
  };
};

export async function refresh(params: RefreshParams): Promise<RefreshResult> {
  const tokenHash = hashRefreshToken(params.refreshTokenValue);
  const now = new Date();

  const currentSession = await authRepository.findRefreshSession(tokenHash);

  if (!currentSession?.user || !currentSession.tenant) {
    throw new AppError("Invalid refresh token", 401);
  }

  if (!currentSession.tenant.isActive) {
    throw new AppError("This organization has been deactivated", 403);
  }

  const nextRefreshToken = createRawRefreshToken();
  const nextRefreshTokenHash = hashRefreshToken(nextRefreshToken);
  const nextRefreshExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

  const nextSession = await basePrisma.$transaction(async (tx) => {
    const created = await tx.refreshToken.create({
      data: {
        userId: currentSession!.user.id,
        tenantId: currentSession!.user.tenantId,
        tokenHash: nextRefreshTokenHash,
        expiresAt: nextRefreshExpiresAt,
        createdByIp: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
    await tx.refreshToken.update({
      where: { id: currentSession!.id },
      data: {
        revokedAt: now,
        replacedById: created.id,
      },
    });
    return created;
  });

  const accessToken = createAccessToken({
    id: currentSession.user.id,
    username: currentSession.user.username,
    role: currentSession.user.role,
    tenantId: currentSession.user.tenantId,
    tenantSlug: currentSession.tenant.slug,
    sessionId: nextSession.id,
  });

  return {
    token: accessToken,
    refreshToken: nextRefreshToken,
    user: {
      id: currentSession.user.id,
      username: currentSession.user.username,
      role: currentSession.user.role,
      tenantId: currentSession.user.tenantId,
    },
    tenant: {
      id: currentSession.tenant.id,
      slug: currentSession.tenant.slug,
      name: currentSession.tenant.name,
      plan: currentSession.tenant.plan,
      subscriptionStatus: currentSession.tenant.subscriptionStatus,
      planExpiresAt: currentSession.tenant.planExpiresAt,
      trialEndsAt: currentSession.tenant.trialEndsAt,
    },
  };
}

export type LogoutParams = {
  userId: string;
  refreshTokenValue: string | null;
};

export type LogoutResult = {
  revokedSessions: number;
};

export async function logout(params: LogoutParams): Promise<LogoutResult> {
  const now = new Date();

  if (params.refreshTokenValue) {
    const tokenHash = hashRefreshToken(params.refreshTokenValue);
    const result = await authRepository.revokeRefreshTokensByHash(
      tokenHash,
      params.userId,
      now,
    );
    return { revokedSessions: result.count };
  }

  return { revokedSessions: 0 };
}

export type LogoutAllParams = {
  userId: string;
};

export type LogoutAllResult = {
  revokedSessions: number;
};

export async function logoutAll(
  params: LogoutAllParams,
): Promise<LogoutAllResult> {
  const result = await authRepository.revokeAllRefreshTokensForUser(
    params.userId,
    new Date(),
  );
  return { revokedSessions: result.count };
}

export type GetCurrentUserParams = {
  userId: string;
  tenantId: string;
};

export type GetCurrentUserResult = {
  user: {
    id: string;
    tenantId: string;
    username: string;
    role: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
  tenant: {
    id: string;
    slug: string;
    name: string;
    plan?: string;
    subscriptionStatus?: string;
    planExpiresAt?: Date | null;
    trialEndsAt?: Date | null;
  };
};

export async function getCurrentUser(
  params: GetCurrentUserParams,
): Promise<GetCurrentUserResult> {
  const user = await authRepository.findUserById(params.userId, {
    id: true,
    tenantId: true,
    username: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  });

  if (!user) {
    throw new AppError("User not found or session invalid", 401);
  }
  if (user.tenantId !== params.tenantId) {
    throw new AppError("User not found or session invalid", 401);
  }

  const tenant = await authRepository.findTenantById(user.tenantId, {
    id: true,
    slug: true,
    name: true,
    plan: true,
    subscriptionStatus: true,
    planExpiresAt: true,
    trialEndsAt: true,
  });

  if (!tenant) {
    throw new AppError("Tenant not found", 401);
  }

  return {
    user: {
      id: user.id,
      tenantId: user.tenantId,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan ?? undefined,
      subscriptionStatus: tenant.subscriptionStatus ?? undefined,
      planExpiresAt: tenant.planExpiresAt,
      trialEndsAt: tenant.trialEndsAt,
    },
  };
}
