/**
 * Leads repository: all Prisma access for leads module.
 * All queries are tenant-scoped; list/get exclude soft-deleted (deletedAt: null).
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const notDeleted = { deletedAt: null };

const listInclude = {
  assignedTo: { select: { id: true, username: true } },
  creator: { select: { id: true, username: true } },
} as const;

export function createLead(data: Prisma.LeadUncheckedCreateInput) {
  return prisma.lead.create({
    data,
    include: listInclude,
  });
}

export function countLeads(where: Prisma.LeadWhereInput) {
  return prisma.lead.count({
    where: { ...where, ...notDeleted },
  });
}

export function findLeads(
  where: Prisma.LeadWhereInput,
  orderBy: Prisma.LeadOrderByWithRelationInput,
  skip: number,
  take: number,
) {
  return prisma.lead.findMany({
    where: { ...where, ...notDeleted },
    orderBy,
    skip,
    take,
    include: listInclude,
  });
}

export function findLeadById(tenantId: string, id: string) {
  return prisma.lead.findFirst({
    where: { id, tenantId, ...notDeleted },
    include: {
      ...listInclude,
      convertedDeal: true,
    },
  });
}

export function findLeadByIdForUpdate(tenantId: string, id: string) {
  return prisma.lead.findFirst({
    where: { id, tenantId, ...notDeleted },
  });
}

export function updateLead(
  id: string,
  data: Prisma.LeadUpdateInput,
  include?: Prisma.LeadInclude,
) {
  return prisma.lead.update({
    where: { id },
    data,
    include: include ?? listInclude,
  });
}
