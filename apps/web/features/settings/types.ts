/**
 * Settings feature types.
 */

import type { PaginationMeta } from "@/lib/apiTypes";

export interface AuditLog {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string;
  details?: Record<string, unknown>;
  userId: string;
  createdAt: string;
  user?: { id: string; username: string; role?: string };
}

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string | null;
  status: string;
  createdAt: string;
}

export interface AuditLogListParams {
  page?: number;
  limit?: number;
  action?: string;
  resource?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedAuditLogsResponse {
  data: AuditLog[];
  pagination: PaginationMeta;
}
