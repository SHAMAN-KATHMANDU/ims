import prisma from "@/config/prisma";

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
