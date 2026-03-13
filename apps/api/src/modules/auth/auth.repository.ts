import type { Prisma } from "@prisma/client";
import { basePrisma } from "@/config/prisma";

/**
 * Auth repository uses basePrisma for cross-tenant auth operations:
 * - Tenant lookup by slug (login)
 * - User lookup by tenantId + username (login)
 * - User/tenant fetch for getMe
 * - Audit log for LOGIN
 */
export class AuthRepository {
  async findTenantBySlug(slug: string) {
    return basePrisma.tenant.findUnique({
      where: { slug },
    });
  }

  /** Fetch only org name by slug (public, for login page display). */
  async findOrgNameBySlug(slug: string): Promise<{ name: string } | null> {
    const tenant = await basePrisma.tenant.findUnique({
      where: { slug },
      select: { name: true },
    });
    return tenant ? { name: tenant.name } : null;
  }

  async findUserByTenantAndUsername(tenantId: string, username: string) {
    return basePrisma.user.findFirst({
      where: { tenantId, username },
    });
  }

  async updateUserLastLogin(userId: string, lastLoginAt: Date) {
    return basePrisma.user.update({
      where: { id: userId },
      data: { lastLoginAt },
    });
  }

  async createAuditLog(data: {
    tenantId: string | null;
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    details?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }) {
    return basePrisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        details: (data.details ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        ip: data.ip,
        userAgent: data.userAgent,
      },
    });
  }

  async findUserById(userId: string) {
    return basePrisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findTenantById(tenantId: string) {
    return basePrisma.tenant.findUnique({
      where: { id: tenantId },
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
  }

  async findUserWithPassword(userId: string) {
    return basePrisma.user.findUnique({
      where: { id: userId },
    });
  }

  async updateUserPassword(userId: string, hashedPassword: string) {
    return basePrisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: {
        id: true,
        tenantId: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createPasswordResetRequest(data: {
    tenantId: string;
    requestedById: string;
    escalated: boolean;
  }) {
    return basePrisma.passwordResetRequest.create({
      data: {
        tenantId: data.tenantId,
        requestedById: data.requestedById,
        ...(data.escalated ? { status: "ESCALATED" as const } : {}),
      },
    });
  }
}

export default new AuthRepository();
