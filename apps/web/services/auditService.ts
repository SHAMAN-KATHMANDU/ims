/**
 * Audit Log Service
 * Fetches audit logs (superAdmin only).
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

export interface AuditLogsParams {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
}

export interface PaginatedAuditLogsResponse {
  data: AuditLogEntry[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export async function getAuditLogs(
  params: AuditLogsParams = {},
): Promise<PaginatedAuditLogsResponse> {
  const { page = 1, limit = 20, userId, action, from, to } = params;
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (userId) queryParams.set("userId", userId);
  if (action) queryParams.set("action", action);
  if (from) queryParams.set("from", from);
  if (to) queryParams.set("to", to);

  try {
    const response = await api.get<{
      data: AuditLogEntry[];
      pagination: PaginatedAuditLogsResponse["pagination"];
    }>(`/audit-logs?${queryParams.toString()}`);
    return {
      data: response.data.data ?? [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch audit logs");
  }
}
