/**
 * Error reports repository: all Prisma access for error reports.
 * Where clauses are built in the service; tenantId optional (null = all tenants for superAdmin).
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const userInclude = { user: { select: { id: true, username: true } } };

export function createErrorReport(data: {
  tenantId: string | null;
  userId: string;
  title: string;
  description?: string | null;
  pageUrl?: string | null;
}) {
  return prisma.errorReport.create({
    data: {
      tenantId: data.tenantId,
      userId: data.userId,
      title: data.title,
      description: data.description ?? null,
      pageUrl: data.pageUrl ?? null,
    },
    include: userInclude,
  });
}

export function countErrorReports(where: Prisma.ErrorReportWhereInput) {
  return prisma.errorReport.count({ where });
}

export function findErrorReports(
  where: Prisma.ErrorReportWhereInput,
  orderBy: Prisma.ErrorReportOrderByWithRelationInput,
  skip: number,
  take: number,
) {
  return prisma.errorReport.findMany({
    where,
    orderBy,
    skip,
    take,
    include: userInclude,
  });
}

export function updateErrorReport(
  id: string,
  data: { status: "OPEN" | "REVIEWED" | "RESOLVED" },
) {
  return prisma.errorReport.update({
    where: { id },
    data,
    include: userInclude,
  });
}
