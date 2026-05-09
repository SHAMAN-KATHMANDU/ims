"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { collectionsCmsService } from "./collections-cms.service";
import type {
  CreateCollectionPayload,
  UpdateCollectionPayload,
  CollectionDetail,
} from "./types";

export const collectionsCmsKeys = {
  all: ["collections-cms"] as const,
  list: () => [...collectionsCmsKeys.all, "list"] as const,
  detail: (id: string) => [...collectionsCmsKeys.all, "detail", id] as const,
};

export function useCollectionsCmsList() {
  return useQuery({
    queryKey: collectionsCmsKeys.list(),
    queryFn: collectionsCmsService.list,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCollectionCmsDetail(id: string) {
  return useQuery({
    queryKey: collectionsCmsKeys.detail(id),
    queryFn: () => collectionsCmsService.get(id),
    enabled: !!id,
  });
}

export function useCreateCollectionCms() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: CreateCollectionPayload) =>
      collectionsCmsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collectionsCmsKeys.list() });
      toast({ title: "Collection created" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create collection",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateCollectionCms() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateCollectionPayload;
    }) => collectionsCmsService.update(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: collectionsCmsKeys.list() });
      qc.invalidateQueries({ queryKey: collectionsCmsKeys.detail(id) });
      toast({ title: "Collection updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update collection",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteCollectionCms() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => collectionsCmsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collectionsCmsKeys.list() });
      toast({ title: "Collection deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete collection",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSetCollectionCmsProducts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, productIds }: { id: string; productIds: string[] }) =>
      collectionsCmsService.setProducts(id, productIds),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: collectionsCmsKeys.detail(id) });
      toast({ title: "Products updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update products",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
