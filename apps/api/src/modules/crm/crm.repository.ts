/**
 * CRM repository: all Prisma access for dashboard, reports, and export.
 * All queries are tenant-scoped via where clauses built in the service.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

export function aggregateDealsSum(where: Prisma.DealWhereInput) {
  return prisma.deal.aggregate({
    where,
    _sum: { value: true },
  });
}

export function countDeals(where: Prisma.DealWhereInput) {
  return prisma.deal.count({ where });
}

export function countTasks(where: Prisma.TaskWhereInput) {
  return prisma.task.count({ where });
}

export function groupLeadsByStatus(tenantId: string) {
  return prisma.lead.groupBy({
    by: ["status"],
    where: { tenantId },
    _count: true,
  });
}

export function groupLeadsBySource(tenantId: string) {
  return prisma.lead.groupBy({
    by: ["source"],
    _count: true,
    where: { tenantId, source: { not: null } },
  });
}

export function findDeals(
  where: Prisma.DealWhereInput,
  select: Prisma.DealSelect,
) {
  return prisma.deal.findMany({ where, select });
}

export function groupDealsByAssigned(where: Prisma.DealWhereInput) {
  return prisma.deal.groupBy({
    by: ["assignedToId"],
    where,
    _count: true,
    _sum: { value: true },
  });
}

export function findActivitiesRecent(
  tenantId: string,
  take: number,
  include: Prisma.ActivityInclude,
) {
  return prisma.activity.findMany({
    where: { tenantId },
    orderBy: { activityAt: "desc" },
    take,
    include,
  });
}

export function findUsersByIds(
  tenantId: string,
  ids: string[],
  select: Prisma.UserSelect,
) {
  if (ids.length === 0) return Promise.resolve([]);
  return prisma.user.findMany({
    where: { id: { in: ids }, tenantId },
    select,
  });
}
