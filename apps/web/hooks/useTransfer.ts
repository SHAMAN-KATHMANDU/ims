"use client";

/**
 * React Query wrappers for transfers. Business logic and API calls live in transferService; hooks only wire query/mutation and cache keys.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTransfers,
  getTransferById,
  getTransferLogs,
  createTransfer,
  approveTransfer,
  startTransit,
  completeTransfer,
  cancelTransfer,
  getStatusColor,
  getStatusLabel,
  canApprove,
  canStartTransit,
  canComplete,
  canCancel,
  type Transfer,
  type TransferItem,
  type TransferLog,
  type TransferListParams,
  type PaginatedTransfersResponse,
  type CreateTransferData,
  type TransferStatus,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/services/transferService";
import { inventoryKeys } from "./useInventory";

// Re-export types for convenience
export type {
  Transfer,
  TransferItem,
  TransferLog,
  TransferListParams,
  PaginatedTransfersResponse,
  CreateTransferData,
  TransferStatus,
};

// Re-export defaults and helpers
export {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  getStatusColor,
  getStatusLabel,
  canApprove,
  canStartTransit,
  canComplete,
  canCancel,
};

// ============================================
// Query Keys
// ============================================

export const transferKeys = {
  all: ["transfers"] as const,
  lists: () => [...transferKeys.all, "list"] as const,
  list: (params: TransferListParams) =>
    [...transferKeys.lists(), params] as const,
  details: () => [...transferKeys.all, "detail"] as const,
  detail: (id: string) => [...transferKeys.details(), id] as const,
  logs: (id: string) => [...transferKeys.all, "logs", id] as const,
};

// ============================================
// Transfer Hooks
// ============================================

/**
 * Hook for fetching paginated transfers with filtering
 */
export function useTransfersPaginated(params: TransferListParams = {}) {
  const normalizedParams: TransferListParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    search: params.search?.trim() || "",
    status: params.status,
    fromLocationId: params.fromLocationId,
    toLocationId: params.toLocationId,
    locationId: params.locationId,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };

  return useQuery({
    queryKey: transferKeys.list(normalizedParams),
    queryFn: () => getTransfers(normalizedParams),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for fetching a single transfer by ID with full details
 */
export function useTransfer(id: string) {
  return useQuery({
    queryKey: transferKeys.detail(id),
    queryFn: () => getTransferById(id),
    enabled: !!id,
  });
}

/**
 * Hook for fetching transfer logs
 */
export function useTransferLogs(transferId: string) {
  return useQuery({
    queryKey: transferKeys.logs(transferId),
    queryFn: () => getTransferLogs(transferId),
    enabled: !!transferId,
  });
}

/**
 * Hook for creating a new transfer
 */
export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransferData) => createTransfer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
      queryClient.refetchQueries({ queryKey: transferKeys.lists() });
    },
  });
}

/**
 * Hook for approving a transfer
 */
export function useApproveTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => approveTransfer(id),
    onSuccess: (updatedTransfer) => {
      queryClient.setQueryData(
        transferKeys.detail(updatedTransfer.id),
        updatedTransfer,
      );
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
      queryClient.refetchQueries({ queryKey: transferKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: transferKeys.logs(updatedTransfer.id),
      });
    },
  });
}

/**
 * Hook for starting transit (deducts stock from source)
 */
export function useStartTransit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => startTransit(id),
    onSuccess: (updatedTransfer) => {
      queryClient.setQueryData(
        transferKeys.detail(updatedTransfer.id),
        updatedTransfer,
      );
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
      queryClient.refetchQueries({ queryKey: transferKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: transferKeys.logs(updatedTransfer.id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

/**
 * Hook for completing a transfer (adds stock to destination)
 */
export function useCompleteTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => completeTransfer(id),
    onSuccess: (updatedTransfer) => {
      queryClient.setQueryData(
        transferKeys.detail(updatedTransfer.id),
        updatedTransfer,
      );
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
      queryClient.refetchQueries({ queryKey: transferKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: transferKeys.logs(updatedTransfer.id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

/**
 * Hook for cancelling a transfer
 */
export function useCancelTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      cancelTransfer(id, reason),
    onSuccess: (updatedTransfer) => {
      queryClient.setQueryData(
        transferKeys.detail(updatedTransfer.id),
        updatedTransfer,
      );
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
      queryClient.refetchQueries({ queryKey: transferKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: transferKeys.logs(updatedTransfer.id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}
