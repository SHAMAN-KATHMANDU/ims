"use client";

/**
 * React Query wrappers for bundles. Business logic and API calls live in bundle.service; hooks only wire query/mutation and cache keys.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBundles,
  getBundleById,
  createBundle,
  updateBundle,
  deleteBundle,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "../services/bundle.service";
import type {
  Bundle,
  BundleListParams,
  CreateBundleData,
  PaginatedBundlesResponse,
  UpdateBundleData,
} from "../types";

export type {
  Bundle,
  BundleListParams,
  PaginatedBundlesResponse,
  CreateBundleData,
  UpdateBundleData,
};

export { DEFAULT_PAGE, DEFAULT_LIMIT };

export const bundleKeys = {
  all: ["bundles"] as const,
  lists: () => [...bundleKeys.all, "list"] as const,
  list: (params: BundleListParams) => [...bundleKeys.lists(), params] as const,
  details: () => [...bundleKeys.all, "detail"] as const,
  detail: (id: string) => [...bundleKeys.details(), id] as const,
};

export function useBundlesPaginated(params: BundleListParams = {}) {
  const normalizedParams: BundleListParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    search: params.search?.trim() || "",
    active: params.active,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };

  return useQuery({
    queryKey: bundleKeys.list(normalizedParams),
    queryFn: () => getBundles(normalizedParams),
    placeholderData: (previousData) => previousData,
  });
}

export function useBundle(id: string) {
  return useQuery({
    queryKey: bundleKeys.detail(id),
    queryFn: () => getBundleById(id),
    enabled: !!id,
  });
}

export function useCreateBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBundleData) => createBundle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bundleKeys.lists() });
    },
  });
}

export function useUpdateBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBundleData }) =>
      updateBundle(id, data),
    onSuccess: (bundle) => {
      queryClient.setQueryData(bundleKeys.detail(bundle.id), bundle);
      queryClient.invalidateQueries({ queryKey: bundleKeys.lists() });
    },
  });
}

export function useDeleteBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBundle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bundleKeys.lists() });
    },
  });
}
