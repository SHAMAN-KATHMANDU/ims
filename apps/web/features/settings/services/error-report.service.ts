/**
 * Error Report Service
 * Submit and list error reports (from top bar).
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export type ErrorReportStatus = "OPEN" | "REVIEWED" | "RESOLVED";

export interface ErrorReport {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  pageUrl: string | null;
  status: ErrorReportStatus;
  createdAt: string;
  user?: { id: string; username: string };
}

export interface CreateErrorReportData {
  title: string;
  description?: string;
  pageUrl?: string;
}

export interface ErrorReportsListParams {
  page?: number;
  limit?: number;
  status?: ErrorReportStatus;
  userId?: string;
  from?: string;
  to?: string;
}

export interface PaginatedErrorReportsResponse {
  data: ErrorReport[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export async function createErrorReport(
  data: CreateErrorReportData,
): Promise<ErrorReport> {
  try {
    const response = await api.post<{ report: ErrorReport }>(
      "/error-reports",
      data,
    );
    return response.data.report;
  } catch (error) {
    handleApiError(error, "submit error report");
  }
}

export async function getErrorReports(
  params: ErrorReportsListParams = {},
): Promise<PaginatedErrorReportsResponse> {
  const { page = 1, limit = 20, status, userId, from, to } = params;
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (status) queryParams.set("status", status);
  if (userId) queryParams.set("userId", userId);
  if (from) queryParams.set("from", from);
  if (to) queryParams.set("to", to);

  try {
    const response = await api.get<{
      data: ErrorReport[];
      pagination: PaginatedErrorReportsResponse["pagination"];
    }>(`/error-reports?${queryParams.toString()}`);
    return {
      data: response.data.data ?? [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch error reports");
  }
}

export async function updateErrorReportStatus(
  id: string,
  status: ErrorReportStatus,
): Promise<ErrorReport> {
  try {
    const response = await api.patch<{ report: ErrorReport }>(
      `/error-reports/${id}`,
      { status },
    );
    return response.data.report;
  } catch (error) {
    handleApiError(error, "update error report status");
  }
}
