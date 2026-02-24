/**
 * Audit service: builds filters and returns paginated audit logs.
 */

import type { Prisma } from "@prisma/client";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import * as auditRepository from "./audit.repository";

export type AuditLogsQuery = {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
};

export async function getAuditLogs(
  tenantId: string | null,
  query: AuditLogsQuery,
) {
  const { page, limit } = getPaginationParams(query);
  const { userId, action, from, to } = query;

  const where: Prisma.AuditLogWhereInput = {};
  if (tenantId) where.tenantId = tenantId;
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (from || to) {
    where.createdAt = {};
    if (from) {
      where.createdAt.gte = new Date(from + "T00:00:00.000Z");
    }
    if (to) {
      where.createdAt.lte = new Date(to + "T23:59:59.999Z");
    }
  }

  const skip = (page - 1) * limit;

  const [totalItems, logs] = await Promise.all([
    auditRepository.countAuditLogs(where),
    auditRepository.findAuditLogs(where, { createdAt: "desc" }, skip, limit),
  ]);

  return createPaginationResult(logs, totalItems, page, limit);
}
