"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  type Vendor,
  type VendorProduct,
  type VendorListParams,
  type PaginatedVendorsResponse,
  type CreateOrUpdateVendorData,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/services/vendorService";

export type {
  Vendor,
  VendorProduct,
  VendorListParams,
  PaginatedVendorsResponse,
  CreateOrUpdateVendorData,
};

export { DEFAULT_PAGE, DEFAULT_LIMIT };

export const vendorKeys = {
  all: ["vendors"] as const,
  lists: () => [...vendorKeys.all, "list"] as const,
  list: (params: VendorListParams) => [...vendorKeys.lists(), params] as const,
  details: () => [...vendorKeys.all, "detail"] as const,
  detail: (id: string) => [...vendorKeys.details(), id] as const,
};

export function useVendorsPaginated(params: VendorListParams = {}) {
  const normalizedParams: VendorListParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    search: params.search?.trim() || "",
  };

  return useQuery({
    queryKey: vendorKeys.list(normalizedParams),
    queryFn: () => getVendors(normalizedParams),
    placeholderData: (previousData) => previousData,
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn: () => getVendorById(id),
    enabled: !!id,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrUpdateVendorData) => createVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: CreateOrUpdateVendorData;
    }) => updateVendor(id, data),
    onSuccess: (vendor) => {
      queryClient.setQueryData(vendorKeys.detail(vendor.id), vendor);
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
    },
  });
}
