/**
 * Audit repository: all Prisma access for audit logs.
 * Queries are tenant-scoped when tenantId is provided.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

export type AuditLogWhere = Prisma.AuditLogWhereInput;

const auditLogInclude = {
  user: {
    select: { id: true, username: true, role: true },
  },
} as const;

export function countAuditLogs(where: AuditLogWhere): Promise<number> {
  return prisma.auditLog.count({ where });
}

export function findAuditLogs(
  where: AuditLogWhere,
  orderBy: Prisma.AuditLogOrderByWithRelationInput,
  skip: number,
  take: number,
) {
  return prisma.auditLog.findMany({
    where,
    skip,
    take,
    orderBy,
    include: auditLogInclude,
  });
}

export function createAuditLog(data: Prisma.AuditLogCreateInput) {
  return prisma.auditLog.create({ data });
}
