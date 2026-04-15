"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listWebsiteOrders,
  getWebsiteOrder,
  verifyWebsiteOrder,
  rejectWebsiteOrder,
  convertWebsiteOrder,
  deleteWebsiteOrder,
  type ListWebsiteOrdersQuery,
  type RejectOrderData,
  type ConvertOrderData,
} from "../services/website-orders.service";

export const websiteOrdersKeys = {
  all: ["website-orders"] as const,
  list: (query?: ListWebsiteOrdersQuery) =>
    [...websiteOrdersKeys.all, "list", query ?? {}] as const,
  order: (id: string) => [...websiteOrdersKeys.all, "order", id] as const,
};

export function useWebsiteOrders(query: ListWebsiteOrdersQuery = {}) {
  return useQuery({
    queryKey: websiteOrdersKeys.list(query),
    queryFn: () => listWebsiteOrders(query),
    retry: false,
  });
}

export function useWebsiteOrder(id: string | null) {
  return useQuery({
    queryKey: websiteOrdersKeys.order(id ?? ""),
    queryFn: () => {
      if (!id) throw new Error("Order id is required");
      return getWebsiteOrder(id);
    },
    enabled: !!id,
    retry: false,
  });
}

export function useVerifyWebsiteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => verifyWebsiteOrder(id),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: websiteOrdersKeys.all });
      qc.setQueryData(websiteOrdersKeys.order(order.id), order);
    },
  });
}

export function useRejectWebsiteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectOrderData }) =>
      rejectWebsiteOrder(id, data),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: websiteOrdersKeys.all });
      qc.setQueryData(websiteOrdersKeys.order(order.id), order);
    },
  });
}

export function useConvertWebsiteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConvertOrderData }) =>
      convertWebsiteOrder(id, data),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: websiteOrdersKeys.all });
      qc.setQueryData(websiteOrdersKeys.order(order.id), order);
    },
  });
}

export function useDeleteWebsiteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWebsiteOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: websiteOrdersKeys.all });
    },
  });
}
