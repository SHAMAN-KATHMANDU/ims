/**
 * Error reports service: create, list, update status.
 * Uses repository for all data access; no Prisma in this file.
 */

import type { Prisma } from "@prisma/client";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import * as repo from "./error-reports.repository";

export type CreateErrorReportInput = {
  title: string;
  description?: string | null;
  pageUrl?: string | null;
};

export type ListErrorReportsQuery = {
  page?: number;
  limit?: number;
  status?: "OPEN" | "REVIEWED" | "RESOLVED";
  userId?: string;
  from?: string;
  to?: string;
};

export async function create(
  tenantId: string | null,
  userId: string,
  input: CreateErrorReportInput,
) {
  const title = input.title.slice(0, 255);
  const description = input.description
    ? input.description.slice(0, 5000)
    : null;
  const pageUrl = input.pageUrl ? input.pageUrl.slice(0, 500) : null;

  return repo.createErrorReport({
    tenantId,
    userId,
    title,
    description,
    pageUrl,
  });
}

export async function list(
  tenantId: string | null,
  query: ListErrorReportsQuery,
) {
  const { page, limit } = getPaginationParams(
    query as Parameters<typeof getPaginationParams>[0],
  );
  const { status, userId, from, to } = query;

  const where: Prisma.ErrorReportWhereInput = {};
  if (tenantId != null) where.tenantId = tenantId;
  if (status) where.status = status;
  if (userId) where.userId = userId;
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    const fromDate = new Date(from + "T00:00:00.000Z");
    where.createdAt = { ...(where.createdAt as object), gte: fromDate };
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const toDate = new Date(to + "T23:59:59.999Z");
    where.createdAt = { ...(where.createdAt as object), lte: toDate };
  }

  const skip = (page - 1) * limit;

  const [totalItems, reports] = await Promise.all([
    repo.countErrorReports(where),
    repo.findErrorReports(where, { createdAt: "desc" }, skip, limit),
  ]);

  return createPaginationResult(reports, totalItems, page, limit);
}

export async function updateStatus(
  id: string,
  status: "OPEN" | "REVIEWED" | "RESOLVED",
) {
  return repo.updateErrorReport(id, { status });
}
