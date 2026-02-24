/**
 * Auth repository - database access for auth module.
 * Uses basePrisma for platform-level entities (Tenant, User, RefreshToken).
 */

import { basePrisma } from "@/config/prisma";

export const authRepository = {
  findTenantBySlug(slug: string) {
    return basePrisma.tenant.findUnique({
      where: { slug },
    });
  },

  findUserByUsernameAndTenant(tenantId: string, username: string) {
    return basePrisma.user.findFirst({
      where: {
        tenantId,
        username,
      },
    });
  },

  updateUserLockData(
    userId: string,
    data: { failedLoginAttempts: number; lockedUntil?: Date | null },
  ) {
    return basePrisma.user.update({
      where: { id: userId },
      data,
    });
  },

  findUserById(
    id: string,
    select?: {
      id: boolean;
      tenantId: boolean;
      username: boolean;
      role: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
    },
  ) {
    return basePrisma.user.findUnique({
      where: { id },
      select: select ?? undefined,
    });
  },

  findTenantById(
    id: string,
    select?: {
      id: boolean;
      slug: boolean;
      name: boolean;
      plan?: boolean;
      subscriptionStatus?: boolean;
      planExpiresAt?: boolean;
      trialEndsAt?: boolean;
      isActive?: boolean;
    },
  ) {
    return basePrisma.tenant.findUnique({
      where: { id },
      select: select ?? undefined,
    });
  },

  findRefreshSession(tokenHash: string) {
    return basePrisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
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
  },

  revokeRefreshTokensByHash(
    tokenHash: string,
    userId: string,
    revokedAt: Date,
  ) {
    return basePrisma.refreshToken.updateMany({
      where: {
        tokenHash,
        userId,
        revokedAt: null,
      },
      data: { revokedAt },
    });
  },

  revokeAllRefreshTokensForUser(userId: string, revokedAt: Date) {
    return basePrisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt },
    });
  },
};
