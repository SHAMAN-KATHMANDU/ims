"use client";

/**
 * React Query wrappers for sales. Business logic and API calls live in sales.service; hooks wire query/mutation and cache keys.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  contactKeys,
  crmKeys,
  dealKeys,
  taskKeys,
  workflowKeys,
} from "@/features/crm";
import {
  getSales,
  getSaleById,
  getMySales,
  getSalesSinceLastLogin,
  createSale,
  addPaymentToSale,
  deleteSale,
  editSale,
  getSalesSummary,
  getSalesByLocation,
  getDailySales,
  type Sale,
  type SaleItem,
  type SaleType,
  type SalesListParams,
  type PaginatedSalesResponse,
  type CreateSaleData,
  type EditSaleData,
  type SalesSummary,
  type LocationSalesStat,
  type DailySalesStat,
  type PaymentMethod,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  getSaleTypeLabel,
  getSaleTypeColor,
  formatCurrency,
} from "../services/sales.service";
import { productKeys } from "@/features/products";
import { inventoryKeys } from "@/features/analytics";

export type {
  Sale,
  SaleItem,
  SaleType,
  SalesListParams,
  PaginatedSalesResponse,
  CreateSaleData,
  EditSaleData,
  SalesSummary,
  LocationSalesStat,
  DailySalesStat,
  PaymentMethod,
};

export {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  getSaleTypeLabel,
  getSaleTypeColor,
  formatCurrency,
};

export const salesKeys = {
  all: ["sales"] as const,
  lists: () => [...salesKeys.all, "list"] as const,
  list: (params: SalesListParams) => [...salesKeys.lists(), params] as const,
  details: () => [...salesKeys.all, "detail"] as const,
  detail: (id: string) => [...salesKeys.details(), id] as const,
  analytics: () => [...salesKeys.all, "analytics"] as const,
  summary: (params: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
  }) => [...salesKeys.analytics(), "summary", params] as const,
  byLocation: (params: { startDate?: string; endDate?: string }) =>
    [...salesKeys.analytics(), "by-location", params] as const,
  daily: (params: { locationId?: string; days?: number }) =>
    [...salesKeys.analytics(), "daily", params] as const,
  mySales: (params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
    startDate?: string;
    endDate?: string;
    locationId?: string;
    type?: string;
    isCreditSale?: boolean;
  }) => [...salesKeys.all, "me", params] as const,
  mySalesAll: () => [...salesKeys.all, "me"] as const,
  sinceLastLogin: (params: { page?: number; limit?: number }) =>
    [...salesKeys.all, "since-last-login", params] as const,
};

export function useSalesPaginated(
  params: SalesListParams & { enabled?: boolean } = {},
) {
  const { enabled = true, ...rest } = params;
  const normalizedParams: SalesListParams = {
    page: rest.page ?? DEFAULT_PAGE,
    limit: rest.limit ?? DEFAULT_LIMIT,
    locationId: rest.locationId,
    createdById: rest.createdById,
    type: rest.type,
    isCreditSale: rest.isCreditSale,
    startDate: rest.startDate,
    endDate: rest.endDate,
    search: rest.search?.trim() || "",
    sortBy: rest.sortBy ?? "createdAt",
    sortOrder: rest.sortOrder ?? "desc",
  };
  return useQuery({
    queryKey: salesKeys.list(normalizedParams),
    queryFn: () => getSales(normalizedParams),
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: salesKeys.detail(id),
    queryFn: () => getSaleById(id),
    enabled: !!id,
  });
}

export interface MySalesParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  startDate?: string;
  endDate?: string;
  locationId?: string;
  type?: "GENERAL" | "MEMBER";
  isCreditSale?: boolean;
}

export function useMySales(params: MySalesParams = {}) {
  const normalizedParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    sortBy: params.sortBy ?? "createdAt",
    sortOrder: params.sortOrder ?? "desc",
    startDate: params.startDate,
    endDate: params.endDate,
    locationId: params.locationId,
    type: params.type,
    isCreditSale: params.isCreditSale,
  };
  return useQuery({
    queryKey: salesKeys.mySales(normalizedParams),
    queryFn: () => getMySales(normalizedParams),
    placeholderData: (previousData) => previousData,
  });
}

export function useSalesSinceLastLogin(
  params: { page?: number; limit?: number } = {},
) {
  const normalizedParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
  };
  return useQuery({
    queryKey: salesKeys.sinceLastLogin(normalizedParams),
    queryFn: () => getSalesSinceLastLogin(normalizedParams),
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSaleData) => createSale(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesKeys.mySalesAll() });
      queryClient.invalidateQueries({ queryKey: salesKeys.analytics() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: contactKeys.all });
      queryClient.invalidateQueries({ queryKey: crmKeys.all });
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workflowKeys.all });
    },
  });
}

export function useAddPaymentToSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      saleId,
      method,
      amount,
    }: {
      saleId: string;
      method: PaymentMethod;
      amount: number;
    }) => addPaymentToSale(saleId, method, amount),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: salesKeys.detail(variables.saleId),
      });
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesKeys.mySalesAll() });
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      saleId,
      deleteReason,
    }: {
      saleId: string;
      deleteReason?: string | null;
    }) => deleteSale(saleId, deleteReason),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({
        queryKey: salesKeys.detail(variables.saleId),
      });
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesKeys.mySalesAll() });
      queryClient.invalidateQueries({ queryKey: salesKeys.analytics() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useEditSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, data }: { saleId: string; data: EditSaleData }) =>
      editSale(saleId, data),
    onSuccess: (sale, variables) => {
      // Edit creates a new revision (new id); invalidate both old and new
      queryClient.invalidateQueries({
        queryKey: salesKeys.detail(variables.saleId),
      });
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(sale.id) });
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesKeys.mySalesAll() });
      queryClient.invalidateQueries({ queryKey: salesKeys.analytics() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useSalesSummary(
  params: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
  } = {},
) {
  return useQuery({
    queryKey: salesKeys.summary(params),
    queryFn: () => getSalesSummary(params),
    staleTime: 60 * 1000,
  });
}

export function useSalesByLocation(
  params: { startDate?: string; endDate?: string } = {},
) {
  return useQuery({
    queryKey: salesKeys.byLocation(params),
    queryFn: () => getSalesByLocation(params),
    staleTime: 60 * 1000,
  });
}

export function useDailySales(
  params: { locationId?: string; days?: number } = {},
) {
  return useQuery({
    queryKey: salesKeys.daily(params),
    queryFn: () => getDailySales(params),
    staleTime: 60 * 1000,
  });
}
