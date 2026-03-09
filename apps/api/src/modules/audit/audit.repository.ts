import type { Prisma } from "@prisma/client";
import prisma from "@/config/prisma";

export interface CreateAuditLogData {
  tenantId: string | null;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export interface AuditLogWhere {
  tenantId?: string | null;
  userId?: string;
  action?: string;
  createdAt?: { gte?: Date; lte?: Date };
}

export interface FindAuditLogsParams {
  where: AuditLogWhere;
  skip: number;
  take: number;
}

export class AuditRepository {
  async create(data: CreateAuditLogData) {
    return prisma.auditLog.create({
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

  async count(where: AuditLogWhere) {
    return prisma.auditLog.count({ where });
  }

  async findMany(params: FindAuditLogsParams) {
    return prisma.auditLog.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, username: true, role: true },
        },
      },
    });
  }
}

export default new AuditRepository();
