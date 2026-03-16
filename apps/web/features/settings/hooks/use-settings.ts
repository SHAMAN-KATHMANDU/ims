"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { getAuditLogs, type AuditLogsParams } from "../services/audit.service";
import {
  getErrorReports,
  createErrorReport,
  updateErrorReportStatus,
  type ErrorReportsListParams,
  type CreateErrorReportData,
  type ErrorReportStatus,
} from "../services/error-report.service";
import {
  getPasswordResetRequests,
  approvePasswordResetRequest,
  escalatePasswordResetRequest,
  rejectPasswordResetRequest,
  type GetPasswordResetRequestsParams,
} from "@/features/users/services/user.service";

export const auditLogKeys = {
  all: ["audit-logs"] as const,
  list: (params: AuditLogsParams) => [...auditLogKeys.all, params] as const,
};

export const errorReportKeys = {
  all: ["error-reports"] as const,
  list: (params: ErrorReportsListParams) =>
    [...errorReportKeys.all, params] as const,
};

export function useAuditLogs(params: AuditLogsParams = {}) {
  return useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: () => getAuditLogs(params),
  });
}

export function useErrorReports(params: ErrorReportsListParams = {}) {
  return useQuery({
    queryKey: errorReportKeys.list(params),
    queryFn: () => getErrorReports(params),
  });
}

export function useCreateErrorReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateErrorReportData) => createErrorReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: errorReportKeys.all });
    },
  });
}

export function useUpdateErrorReportStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ErrorReportStatus }) =>
      updateErrorReportStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: errorReportKeys.all });
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });
}

export const passwordResetKeys = {
  all: ["password-reset-requests"] as const,
  list: (params?: GetPasswordResetRequestsParams) =>
    [...passwordResetKeys.all, params] as const,
};

export function usePasswordResetRequests(
  params?: GetPasswordResetRequestsParams,
) {
  return useQuery({
    queryKey: passwordResetKeys.list(params),
    queryFn: () => getPasswordResetRequests(params),
  });
}

export function useApprovePasswordReset() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      requestId,
      newPassword,
    }: {
      requestId: string;
      newPassword: string;
    }) => approvePasswordResetRequest(requestId, newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passwordResetKeys.all });
      toast({ title: "Password reset approved" });
    },
    onError: (err: Error) => {
      toast({
        title: err.message ?? "Failed to approve",
        variant: "destructive",
      });
    },
  });
}

export function useEscalatePasswordReset() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (requestId: string) => escalatePasswordResetRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passwordResetKeys.all });
      toast({ title: "Request escalated to platform admin" });
    },
    onError: (err: Error) => {
      toast({
        title: err.message ?? "Failed to escalate",
        variant: "destructive",
      });
    },
  });
}

export function useRejectPasswordReset() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (requestId: string) => rejectPasswordResetRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passwordResetKeys.all });
      toast({ title: "Request rejected" });
    },
    onError: (err: Error) => {
      toast({
        title: err.message ?? "Failed to reject",
        variant: "destructive",
      });
    },
  });
}
