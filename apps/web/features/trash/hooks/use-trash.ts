"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTrashItems,
  restoreTrashItem,
  permanentlyDeleteTrashItem,
} from "../services/trash.service";
import type { TrashItem, TrashListParams } from "../types";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export type { TrashItem, TrashListParams };

export const trashKeys = {
  all: ["trash"] as const,
  list: (params?: TrashListParams) =>
    [...trashKeys.all, "list", params ?? {}] as const,
};

export function useTrashItems(params: TrashListParams = {}) {
  const normalizedParams: TrashListParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    entityType: params.entityType,
    tenantId: params.tenantId,
    search: params.search?.trim() || undefined,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  return useQuery({
    queryKey: trashKeys.list(normalizedParams),
    queryFn: () => getTrashItems(normalizedParams),
    placeholderData: (previousData) => previousData,
  });
}

export function useRestoreTrashItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entityType, id }: { entityType: string; id: string }) =>
      restoreTrashItem(entityType, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trashKeys.all });
    },
  });
}

export function usePermanentlyDeleteTrashItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entityType, id }: { entityType: string; id: string }) =>
      permanentlyDeleteTrashItem(entityType, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trashKeys.all });
    },
  });
}
